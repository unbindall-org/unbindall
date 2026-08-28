import { randomUUID } from "node:crypto";
import { TRPCError } from "@trpc/server";
import { and, eq, sql } from "drizzle-orm";
import { revalidateTag } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { commandDefinitions } from "@/db/schema";
import {
  COMMAND_CATALOG_CACHE_TAG,
  getAdminCommandCatalog,
  getPublishedCommandCatalog,
} from "@/features/generator/catalog/server/catalog-repository";
import { commandCatalogInputSchema, type CommandCatalogInput } from "@/features/generator/catalog/model";
import { adminProcedure, createTRPCRouter, publicProcedure } from "@/trpc/init";

const updateInput = z.object({
  id: z.string().uuid(),
  expectedRevision: z.number().int().positive(),
  command: commandCatalogInputSchema,
});

export const catalogRouter = createTRPCRouter({
  public: publicProcedure.query(() => getPublishedCommandCatalog()),
  admin: adminProcedure.query(() => getAdminCommandCatalog()),

  create: adminProcedure.input(commandCatalogInputSchema).mutation(async ({ input }) => {
    const id = randomUUID();
    try {
      await db.insert(commandDefinitions).values(toRow(id, input));
    } catch (error) {
      throwCatalogWriteError(error);
    }
    invalidateCatalog();
    return getAdminCommandCatalog();
  }),

  update: adminProcedure.input(updateInput).mutation(async ({ input }) => {
    const [existing] = await db
      .select({ name: commandDefinitions.name, published: commandDefinitions.published })
      .from(commandDefinitions)
      .where(eq(commandDefinitions.id, input.id))
      .limit(1);
    if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Command nicht gefunden." });
    if (existing.published && existing.name !== input.command.name) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Der Name eines veröffentlichten Commands ist unveränderlich." });
    }

    try {
      const [updated] = await db
        .update(commandDefinitions)
        .set({
          ...toRow(input.id, input.command),
          id: undefined,
          revision: sql`${commandDefinitions.revision} + 1`,
          updatedAt: new Date(),
        })
        .where(and(
          eq(commandDefinitions.id, input.id),
          eq(commandDefinitions.revision, input.expectedRevision),
        ))
        .returning({ id: commandDefinitions.id });
      if (!updated) {
        throw new TRPCError({ code: "CONFLICT", message: "Der Command wurde zwischenzeitlich geändert. Bitte neu laden." });
      }
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      throwCatalogWriteError(error);
    }
    invalidateCatalog();
    return getAdminCommandCatalog();
  }),

  remove: adminProcedure.input(z.object({ id: z.string().uuid() })).mutation(async ({ input }) => {
    const [existing] = await db
      .select({ published: commandDefinitions.published })
      .from(commandDefinitions)
      .where(eq(commandDefinitions.id, input.id))
      .limit(1);
    if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Command nicht gefunden." });
    if (existing.published) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Veröffentlichte Commands müssen vor dem Löschen deaktiviert werden." });
    }
    await db.delete(commandDefinitions).where(eq(commandDefinitions.id, input.id));
    invalidateCatalog();
    return { id: input.id };
  }),
});

function toRow(id: string, command: CommandCatalogInput): typeof commandDefinitions.$inferInsert {
  return {
    id,
    name: command.name,
    category: command.category,
    controlType: command.type,
    labelDe: command.label.de,
    labelEn: command.label.en,
    descriptionDe: command.description.de,
    descriptionEn: command.description.en,
    defaultValue: command.defaultValue,
    enabledByDefault: command.enabledByDefault,
    min: command.min ?? null,
    max: command.max ?? null,
    step: command.step ?? null,
    unit: command.unit || null,
    options: command.options,
    preview: command.preview ?? null,
    verification: command.verification,
    restrictions: command.restrictions,
    checkedVersion: command.checkedVersion,
    configTypes: command.configTypes,
    sortOrder: command.sortOrder,
    published: command.published,
  };
}

function invalidateCatalog() {
  if (process.env.NODE_ENV === "test") return;
  revalidateTag(COMMAND_CATALOG_CACHE_TAG, { expire: 0 });
}

function throwCatalogWriteError(error: unknown): never {
  if (error && typeof error === "object" && "code" in error && error.code === "23505") {
    throw new TRPCError({ code: "CONFLICT", message: "Dieser Command-Name ist bereits vergeben." });
  }
  throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Command konnte nicht gespeichert werden.", cause: error });
}
