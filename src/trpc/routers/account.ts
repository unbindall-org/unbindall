import { TRPCError } from "@trpc/server";
import { compare } from "bcryptjs";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { accounts, configRevisions, configs, users } from "@/db/schema";
import { accountExportFormat, accountExportFormatVersion } from "@/features/account/export-file";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";

export const accountRouter = createTRPCRouter({
  details: protectedProcedure.query(async ({ ctx }) => {
    const [account] = await db
      .select({ passwordHash: users.passwordHash })
      .from(users)
      .where(eq(users.id, ctx.userId))
      .limit(1);
    if (!account) throw new TRPCError({ code: "NOT_FOUND", message: "Account nicht gefunden." });

    const linkedAccounts = await db
      .select({ provider: accounts.provider })
      .from(accounts)
      .where(eq(accounts.userId, ctx.userId));

    return {
      hasPassword: Boolean(account.passwordHash),
      providers: linkedAccounts.map(({ provider }) => provider),
    };
  }),

  export: protectedProcedure.query(async ({ ctx }) => {
    const [account] = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .where(eq(users.id, ctx.userId))
      .limit(1);

    if (!account) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Account nicht gefunden." });
    }

    const savedConfigs = await db
      .select({
        id: configs.id,
        name: configs.name,
        values: configs.values,
        rawConfig: configs.rawConfig,
        revision: configs.revision,
        deletedAt: configs.deletedAt,
        createdAt: configs.createdAt,
        updatedAt: configs.updatedAt,
      })
      .from(configs)
      .where(eq(configs.userId, ctx.userId))
      .orderBy(asc(configs.createdAt));

    const revisions = await db
      .select({
        id: configRevisions.id,
        configId: configRevisions.configId,
        revision: configRevisions.revision,
        parentRevision: configRevisions.parentRevision,
        kind: configRevisions.kind,
        name: configRevisions.name,
        label: configRevisions.label,
        snapshot: configRevisions.snapshot,
        patch: configRevisions.patch,
        contentHash: configRevisions.contentHash,
        mutationId: configRevisions.mutationId,
        createdAt: configRevisions.createdAt,
      })
      .from(configRevisions)
      .innerJoin(configs, eq(configRevisions.configId, configs.id))
      .where(eq(configs.userId, ctx.userId))
      .orderBy(asc(configRevisions.createdAt));

    return {
      format: accountExportFormat,
      formatVersion: accountExportFormatVersion,
      exportedAt: new Date().toISOString(),
      account: {
        ...account,
        createdAt: account.createdAt.toISOString(),
        updatedAt: account.updatedAt.toISOString(),
      },
      configs: savedConfigs.map((config) => ({
        ...config,
        deletedAt: config.deletedAt?.toISOString() ?? null,
        createdAt: config.createdAt.toISOString(),
        updatedAt: config.updatedAt.toISOString(),
      })),
      revisions: revisions.map((revision) => ({ ...revision, createdAt: revision.createdAt.toISOString() })),
    };
  }),

  delete: protectedProcedure
    .input(z.object({ password: z.string().max(128).default("") }))
    .mutation(async ({ ctx, input }) => {
      const [user] = await db
        .select({ id: users.id, passwordHash: users.passwordHash })
        .from(users)
        .where(eq(users.id, ctx.userId))
        .limit(1);

      if (!user) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Account nicht gefunden." });
      }

      if (user.passwordHash && !(await compare(input.password, user.passwordHash))) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Passwort ist nicht korrekt." });
      }

      await db.delete(users).where(eq(users.id, user.id));

      return { ok: true };
    }),
});
