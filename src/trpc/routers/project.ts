import { TRPCError } from "@trpc/server";
import { and, asc, count, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { configs, projects } from "@/db/schema";
import { isUniqueViolation } from "@/server/db-errors";
import { accountRateLimit, requestRateLimit } from "@/server/rate-limit";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import { enforceTRPCRateLimits } from "@/trpc/rate-limit";
import { accountProjectQuota, defaultProjectName } from "@/trpc/routers/config";

const projectIdSchema = z.string().uuid();
const nameSchema = z.string().trim().min(1).max(60);

type ProjectRow = typeof projects.$inferSelect;

function serializeProject(row: ProjectRow) {
  return {
    id: row.id,
    name: row.name,
    position: row.position,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function enforceProjectMutationRateLimit(ctx: { userId: string; request?: Request }) {
  await enforceTRPCRateLimits([
    accountRateLimit("configMutationAccount", ctx.userId),
    requestRateLimit("configMutationIp", ctx.request),
  ]);
}

async function loadOwnedProject(userId: string, id: string) {
  const [row] = await db.select().from(projects)
    .where(and(eq(projects.id, id), eq(projects.userId, userId))).limit(1);
  if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Projekt nicht gefunden." });
  return row;
}

function mapDatabaseError(error: unknown): never {
  if (isUniqueViolation(error)) {
    throw new TRPCError({ code: "CONFLICT", message: "Ein Projekt mit diesem Namen existiert bereits." });
  }
  throw error;
}

export const projectRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    const rows = await db.select().from(projects)
      .where(eq(projects.userId, ctx.userId))
      .orderBy(asc(projects.position), asc(projects.createdAt));
    return rows.map(serializeProject);
  }),

  create: protectedProcedure.input(z.object({ name: nameSchema })).mutation(async ({ ctx, input }) => {
    await enforceProjectMutationRateLimit(ctx);
    try {
      return await db.transaction(async (tx) => {
        const [usage] = await tx.select({ count: count() }).from(projects).where(eq(projects.userId, ctx.userId));
        if (usage.count >= accountProjectQuota) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: `Pro Account sind höchstens ${accountProjectQuota} Projekte erlaubt.`,
          });
        }
        const [row] = await tx.insert(projects).values({
          id: crypto.randomUUID(),
          userId: ctx.userId,
          name: input.name,
          position: usage.count,
        }).returning();
        return serializeProject(row);
      });
    } catch (error) {
      mapDatabaseError(error);
    }
  }),

  rename: protectedProcedure
    .input(z.object({ id: projectIdSchema, name: nameSchema }))
    .mutation(async ({ ctx, input }) => {
      await enforceProjectMutationRateLimit(ctx);
      await loadOwnedProject(ctx.userId, input.id);
      try {
        const [row] = await db.update(projects)
          .set({ name: input.name, updatedAt: new Date() })
          .where(and(eq(projects.id, input.id), eq(projects.userId, ctx.userId)))
          .returning();
        return serializeProject(row);
      } catch (error) {
        mapDatabaseError(error);
      }
    }),

  /**
   * Deleting a project never deletes configs. They move to the remaining
   * project so a misclick can cost a folder, never a config.
   */
  delete: protectedProcedure.input(z.object({ id: projectIdSchema })).mutation(async ({ ctx, input }) => {
    await enforceProjectMutationRateLimit(ctx);
    await loadOwnedProject(ctx.userId, input.id);
    return await db.transaction(async (tx) => {
      const remaining = await tx.select({ id: projects.id }).from(projects)
        .where(eq(projects.userId, ctx.userId))
        .orderBy(asc(projects.position), asc(projects.createdAt));
      if (remaining.length <= 1) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Das letzte Projekt kann nicht gelöscht werden." });
      }
      const fallback = remaining.find((project) => project.id !== input.id);
      if (!fallback) throw new TRPCError({ code: "FORBIDDEN", message: "Das letzte Projekt kann nicht gelöscht werden." });

      const [moved] = await tx.select({ count: count() }).from(configs)
        .where(and(eq(configs.projectId, input.id), isNull(configs.deletedAt)));
      await tx.update(configs)
        .set({ projectId: fallback.id })
        .where(and(eq(configs.userId, ctx.userId), eq(configs.projectId, input.id)));
      await tx.delete(projects).where(and(eq(projects.id, input.id), eq(projects.userId, ctx.userId)));
      return { id: input.id, movedConfigs: moved.count, movedTo: fallback.id };
    });
  }),

  /** Creates the default project on demand so a fresh account always has a home. */
  ensureDefault: protectedProcedure.mutation(async ({ ctx }) => {
    const [existing] = await db.select().from(projects)
      .where(eq(projects.userId, ctx.userId))
      .orderBy(asc(projects.position), asc(projects.createdAt)).limit(1);
    if (existing) return serializeProject(existing);
    const [created] = await db.insert(projects)
      .values({ id: crypto.randomUUID(), userId: ctx.userId, name: defaultProjectName, position: 0 })
      .returning();
    return serializeProject(created);
  }),
});
