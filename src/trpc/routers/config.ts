import { createHash } from "node:crypto";
import { TRPCError } from "@trpc/server";
import { and, asc, count, desc, eq, gt, isNotNull, isNull, lt, lte, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { configRevisions, configs, users, type ConfigRevisionKind, type ConfigValues } from "@/db/schema";
import { generatorDocumentSchema } from "@/features/generator/domain/schema";
import {
  applyJsonPatch,
  canonicalJson,
  createJsonPatch,
  shouldStoreSnapshot,
  type JsonPatch,
  type JsonValue,
} from "@/features/generator/domain/versioning";
import { accountRateLimit, requestRateLimit } from "@/server/rate-limit";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import { enforceTRPCRateLimits } from "@/trpc/rate-limit";

export const accountConfigQuota = 25;
export const accountStorageQuotaBytes = 10 * 1024 * 1024;
export const revisionRetention = 100;
const revisionCompactionThreshold = 200;

const mutationIdSchema = z.string().uuid();
const configIdSchema = z.string().uuid();
const contentInput = z.object({
  name: z.string().trim().min(1).max(60),
  values: generatorDocumentSchema,
  rawConfig: z.string().max(100_000),
});
const writeInput = contentInput.extend({
  id: configIdSchema,
  expectedRevision: z.number().int().nonnegative(),
  mutationId: mutationIdSchema,
  checkpointLabel: z.string().trim().min(1).max(80).optional(),
});

type ConfigRow = typeof configs.$inferSelect;
type ConfigMetadataRow = Pick<ConfigRow, "id" | "name" | "revision" | "createdAt" | "updatedAt" | "deletedAt">;
const configMetadataSelection = {
  id: configs.id,
  name: configs.name,
  revision: configs.revision,
  createdAt: configs.createdAt,
  updatedAt: configs.updatedAt,
  deletedAt: configs.deletedAt,
};

function serializeMetadata(row: ConfigMetadataRow) {
  return {
    id: row.id,
    name: row.name,
    revision: row.revision,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    deletedAt: row.deletedAt?.toISOString() ?? null,
  };
}

function serializeConfig(row: ConfigRow) {
  return { ...serializeMetadata(row), values: row.values, rawConfig: row.rawConfig };
}

function hashDocument(value: ConfigValues) {
  return createHash("sha256").update(canonicalJson(value as JsonValue)).digest("hex");
}

function conflict(currentRevision: number) {
  return new TRPCError({
    code: "CONFLICT",
    message: `Versionskonflikt. Auf dem Server liegt bereits Revision ${currentRevision}.`,
  });
}

function mapDatabaseError(error: unknown): never {
  if (isUniqueViolation(error)) {
    throw new TRPCError({ code: "CONFLICT", message: "Eine aktive Config mit diesem Namen existiert bereits." });
  }
  throw error;
}

function isUniqueViolation(error: unknown) {
  return Boolean(error && typeof error === "object" && "code" in error && error.code === "23505");
}

type DatabaseTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function enforceConfigMutationRateLimit(ctx: { userId: string; request?: Request }) {
  await enforceTRPCRateLimits([
    accountRateLimit("configMutationAccount", ctx.userId),
    requestRateLimit("configMutationIp", ctx.request),
  ]);
}

async function lockAccount(tx: DatabaseTransaction, userId: string) {
  const [account] = await tx
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, userId))
    .for("update")
    .limit(1);
  if (!account) throw new TRPCError({ code: "NOT_FOUND", message: "Account nicht gefunden." });
}

async function enforceAccountQuota(tx: DatabaseTransaction, userId: string) {
  const [configUsage] = await tx
    .select({
      count: count(),
      bytes: sql<number>`coalesce(sum(
        octet_length(${configs.name}) +
        octet_length(${configs.rawConfig}) +
        octet_length(${configs.values}::text)
      ), 0)`,
    })
    .from(configs)
    .where(eq(configs.userId, userId));

  if (configUsage.count > accountConfigQuota) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `Pro Account sind höchstens ${accountConfigQuota} Configs inklusive Papierkorb erlaubt.`,
    });
  }

  const [revisionUsage] = await tx
    .select({
      bytes: sql<number>`coalesce(sum(
        octet_length(${configRevisions.name}) +
        octet_length(${configRevisions.contentHash}) +
        octet_length(${configRevisions.mutationId}) +
        coalesce(octet_length(${configRevisions.label}), 0) +
        coalesce(octet_length(${configRevisions.snapshot}::text), 0) +
        coalesce(octet_length(${configRevisions.patch}::text), 0)
      ), 0)`,
    })
    .from(configRevisions)
    .innerJoin(configs, eq(configRevisions.configId, configs.id))
    .where(eq(configs.userId, userId));

  const usedBytes = Number(configUsage.bytes) + Number(revisionUsage.bytes);
  if (usedBytes > accountStorageQuotaBytes) {
    throw new TRPCError({
      code: "PAYLOAD_TOO_LARGE",
      message: "Das Speicherlimit von 10 MiB pro Account ist erreicht.",
    });
  }
}

async function compactRevisionHistory(
  tx: DatabaseTransaction,
  configId: string,
  latestRevision: number,
) {
  const [usage] = await tx
    .select({ count: count() })
    .from(configRevisions)
    .where(eq(configRevisions.configId, configId));
  if (usage.count <= revisionCompactionThreshold) return;
  const firstRetainedRevision = latestRevision - revisionRetention + 1;

  const [base] = await tx
    .select({ revision: configRevisions.revision, snapshot: configRevisions.snapshot })
    .from(configRevisions)
    .where(and(
      eq(configRevisions.configId, configId),
      lte(configRevisions.revision, firstRetainedRevision),
      isNotNull(configRevisions.snapshot),
    ))
    .orderBy(desc(configRevisions.revision))
    .limit(1);
  if (!base?.snapshot) {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Revisionskette ist unvollständig." });
  }

  const tail = await tx
    .select({ patch: configRevisions.patch })
    .from(configRevisions)
    .where(and(
      eq(configRevisions.configId, configId),
      gt(configRevisions.revision, base.revision),
      lte(configRevisions.revision, firstRetainedRevision),
    ))
    .orderBy(asc(configRevisions.revision));
  let document = base.snapshot as JsonValue;
  for (const row of tail) {
    if (!row.patch) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Revisionskette ist unvollständig." });
    document = applyJsonPatch(document, row.patch as JsonPatch);
  }

  const parsed = generatorDocumentSchema.safeParse(document);
  if (!parsed.success) {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Revision enthält ein ungültiges Dokument." });
  }
  await tx
    .update(configRevisions)
    .set({ snapshot: parsed.data, patch: null, parentRevision: null })
    .where(and(
      eq(configRevisions.configId, configId),
      eq(configRevisions.revision, firstRetainedRevision),
    ));
  await tx.delete(configRevisions).where(and(
    eq(configRevisions.configId, configId),
    lt(configRevisions.revision, firstRetainedRevision),
  ));
}

async function findMutationResult(userId: string, mutationId: string) {
  const [row] = await db.select({ config: configs }).from(configRevisions)
    .innerJoin(configs, eq(configRevisions.configId, configs.id))
    .where(and(eq(configRevisions.mutationId, mutationId), eq(configs.userId, userId)))
    .limit(1);
  return row?.config;
}

async function loadOwnedConfig(userId: string, id: string, includeDeleted = false) {
  const conditions = [eq(configs.id, id), eq(configs.userId, userId)];
  if (!includeDeleted) conditions.push(isNull(configs.deletedAt));
  const [row] = await db.select().from(configs).where(and(...conditions)).limit(1);
  if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Config nicht gefunden." });
  return row;
}

async function reconstructRevision(configId: string, targetRevision: number) {
  const [base] = await db
    .select({ revision: configRevisions.revision, snapshot: configRevisions.snapshot })
    .from(configRevisions)
    .where(and(
      eq(configRevisions.configId, configId),
      lte(configRevisions.revision, targetRevision),
      isNotNull(configRevisions.snapshot),
    ))
    .orderBy(desc(configRevisions.revision))
    .limit(1);

  if (!base?.snapshot) throw new TRPCError({ code: "NOT_FOUND", message: "Revision nicht gefunden." });

  const tail = await db
    .select({ revision: configRevisions.revision, patch: configRevisions.patch })
    .from(configRevisions)
    .where(and(
      eq(configRevisions.configId, configId),
      gt(configRevisions.revision, base.revision),
      lte(configRevisions.revision, targetRevision),
    ))
    .orderBy(asc(configRevisions.revision));

  let document = base.snapshot as JsonValue;
  for (const row of tail) {
    if (!row.patch) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Revisionskette ist unvollständig." });
    document = applyJsonPatch(document, row.patch as JsonPatch);
  }

  const parsed = generatorDocumentSchema.safeParse(document);
  if (!parsed.success) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Revision enthält ein ungültiges Dokument." });
  return parsed.data;
}

async function appendRevision(args: {
  userId: string;
  id: string;
  expectedRevision: number;
  mutationId: string;
  kind: ConfigRevisionKind;
  name?: string;
  values?: z.infer<typeof generatorDocumentSchema>;
  rawConfig?: string;
  allowDeleted?: boolean;
  markDeleted?: boolean;
  markUndeleted?: boolean;
  checkpointLabel?: string;
}) {
  try {
    return await db.transaction(async (tx) => {
      await lockAccount(tx, args.userId);
      const [current] = await tx
        .select()
        .from(configs)
        .where(and(eq(configs.id, args.id), eq(configs.userId, args.userId)))
        .for("update")
        .limit(1);
      if (!current) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Config nicht gefunden." });
      }

      const [duplicate] = await tx
        .select({ revision: configRevisions.revision })
        .from(configRevisions)
        .where(and(eq(configRevisions.configId, current.id), eq(configRevisions.mutationId, args.mutationId)))
        .limit(1);
      if (duplicate) return serializeConfig(current);
      if (!args.allowDeleted && current.deletedAt) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Config nicht gefunden." });
      }
      if (current.revision !== args.expectedRevision) throw conflict(current.revision);

      const nextName = args.name ?? current.name;
      const nextValues = (args.values ?? current.values) as ConfigValues;
      const nextRawConfig = args.rawConfig ?? current.rawConfig;
      const nextHash = hashDocument(nextValues);
      const sameContent = nextHash === current.contentHash && nextName === current.name;
      if (args.kind === "autosave" && sameContent) return serializeConfig(current);

      const revision = current.revision + 1;
      const patch = createJsonPatch(current.values as JsonValue, nextValues as JsonValue);
      const snapshot = shouldStoreSnapshot(revision, patch, nextValues as JsonValue) ? nextValues : null;
      const now = new Date();
      const kind = nextName !== current.name && patch.length === 0 && args.kind !== "restore" ? "rename" : args.kind;

      await tx.insert(configRevisions).values({
        id: crypto.randomUUID(),
        configId: current.id,
        revision,
        parentRevision: current.revision || null,
        kind,
        name: nextName,
        label: args.kind === "manual" ? args.checkpointLabel ?? null : null,
        snapshot,
        patch: snapshot ? null : patch,
        contentHash: nextHash,
        mutationId: args.mutationId,
        createdAt: now,
      });

      const [updated] = await tx
        .update(configs)
        .set({
          name: nextName,
          values: nextValues,
          rawConfig: nextRawConfig,
          revision,
          contentHash: nextHash,
          deletedAt: args.markDeleted ? now : args.markUndeleted ? null : current.deletedAt,
          updatedAt: now,
        })
        .where(eq(configs.id, current.id))
        .returning();

      await compactRevisionHistory(tx, current.id, revision);
      // A user at the storage ceiling must still be able to move data to the
      // trash and then remove it permanently.
      if (args.kind !== "delete") await enforceAccountQuota(tx, args.userId);

      return serializeConfig(updated);
    });
  } catch (error) {
    mapDatabaseError(error);
  }
}

export const configRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    const rows = await db.select(configMetadataSelection).from(configs)
      .where(and(eq(configs.userId, ctx.userId), isNull(configs.deletedAt)))
      .orderBy(desc(configs.updatedAt));
    return rows.map(serializeMetadata);
  }),

  get: protectedProcedure.input(z.object({ id: configIdSchema })).query(async ({ ctx, input }) =>
    serializeConfig(await loadOwnedConfig(ctx.userId, input.id))),

  create: protectedProcedure
    .input(contentInput.extend({ mutationId: mutationIdSchema }))
    .mutation(async ({ ctx, input }) => {
      await enforceConfigMutationRateLimit(ctx);
      const existing = await findMutationResult(ctx.userId, input.mutationId);
      if (existing) return serializeConfig(existing);
      const id = crypto.randomUUID();
      const now = new Date();
      const values = input.values as ConfigValues;
      const contentHash = hashDocument(values);
      try {
        return await db.transaction(async (tx) => {
          await lockAccount(tx, ctx.userId);
          const [row] = await tx.insert(configs).values({
            id, userId: ctx.userId, name: input.name, values, rawConfig: input.rawConfig,
            revision: 1, contentHash, createdAt: now, updatedAt: now,
          }).returning();
          await tx.insert(configRevisions).values({
            id: crypto.randomUUID(), configId: id, revision: 1, parentRevision: null,
            kind: "create", name: input.name, snapshot: values, patch: null,
            contentHash, mutationId: input.mutationId, createdAt: now,
          });
          await enforceAccountQuota(tx, ctx.userId);
          return serializeConfig(row);
        });
      } catch (error) {
        if (isUniqueViolation(error)) {
          const duplicate = await findMutationResult(ctx.userId, input.mutationId);
          if (duplicate) return serializeConfig(duplicate);
        }
        mapDatabaseError(error);
      }
    }),

  save: protectedProcedure.input(writeInput).mutation(async ({ ctx, input }) => {
    await enforceConfigMutationRateLimit(ctx);
    return appendRevision({ ...input, userId: ctx.userId, kind: "manual" });
  }),

  autosave: protectedProcedure.input(writeInput).mutation(async ({ ctx, input }) => {
    await enforceConfigMutationRateLimit(ctx);
    return appendRevision({ ...input, userId: ctx.userId, kind: "autosave" });
  }),

  history: protectedProcedure
    .input(z.object({ id: configIdSchema, beforeRevision: z.number().int().positive().optional(), limit: z.number().int().min(1).max(100).default(50) }))
    .query(async ({ ctx, input }) => {
      const config = await loadOwnedConfig(ctx.userId, input.id, true);
      const conditions = [eq(configRevisions.configId, config.id)];
      if (input.beforeRevision) conditions.push(lte(configRevisions.revision, input.beforeRevision - 1));
      const rows = await db.select({
        revision: configRevisions.revision,
        parentRevision: configRevisions.parentRevision,
        kind: configRevisions.kind,
        name: configRevisions.name,
        label: configRevisions.label,
        contentHash: configRevisions.contentHash,
        createdAt: configRevisions.createdAt,
      }).from(configRevisions).where(and(...conditions))
        .orderBy(desc(configRevisions.revision)).limit(input.limit + 1);
      return {
        items: rows.slice(0, input.limit).map((row) => ({ ...row, createdAt: row.createdAt.toISOString() })),
        nextBeforeRevision: rows.length > input.limit ? rows[input.limit - 1].revision : null,
      };
    }),

  revision: protectedProcedure
    .input(z.object({ id: configIdSchema, revision: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const config = await loadOwnedConfig(ctx.userId, input.id, true);
      const [metadata] = await db.select({
        name: configRevisions.name,
        contentHash: configRevisions.contentHash,
        createdAt: configRevisions.createdAt,
      }).from(configRevisions)
        .where(and(eq(configRevisions.configId, config.id), eq(configRevisions.revision, input.revision))).limit(1);
      if (!metadata) throw new TRPCError({ code: "NOT_FOUND", message: "Revision nicht gefunden." });
      const values = await reconstructRevision(config.id, input.revision);
      const actualHash = hashDocument(values as ConfigValues);
      const migratedBaseline = input.revision === 1 && metadata.contentHash.length === 32;
      if (actualHash !== metadata.contentHash && !migratedBaseline) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Integritätsprüfung der Revision fehlgeschlagen." });
      }
      return { ...metadata, revision: input.revision, values, createdAt: metadata.createdAt.toISOString() };
    }),

  at: protectedProcedure
    .input(z.object({ id: configIdSchema, time: z.iso.datetime({ offset: true }) }))
    .query(async ({ ctx, input }) => {
      const config = await loadOwnedConfig(ctx.userId, input.id, true);
      const [target] = await db.select({ revision: configRevisions.revision }).from(configRevisions)
        .where(and(eq(configRevisions.configId, config.id), lte(configRevisions.createdAt, new Date(input.time))))
        .orderBy(desc(configRevisions.createdAt), desc(configRevisions.revision)).limit(1);
      if (!target) throw new TRPCError({ code: "NOT_FOUND", message: "Zu diesem Zeitpunkt existierte die Config noch nicht." });
      return { revision: target.revision, values: await reconstructRevision(config.id, target.revision) };
    }),

  restore: protectedProcedure
    .input(z.object({
      id: configIdSchema,
      revision: z.number().int().positive(),
      expectedRevision: z.number().int().nonnegative(),
      mutationId: mutationIdSchema,
      rawConfig: z.string().max(100_000),
    }))
    .mutation(async ({ ctx, input }) => {
      await enforceConfigMutationRateLimit(ctx);
      const config = await loadOwnedConfig(ctx.userId, input.id, true);
      const [target] = await db.select({ name: configRevisions.name }).from(configRevisions)
        .where(and(eq(configRevisions.configId, config.id), eq(configRevisions.revision, input.revision))).limit(1);
      if (!target) throw new TRPCError({ code: "NOT_FOUND", message: "Revision nicht gefunden." });
      const values = await reconstructRevision(config.id, input.revision);
      return appendRevision({
        userId: ctx.userId, id: input.id, expectedRevision: input.expectedRevision,
        mutationId: input.mutationId, kind: "restore", name: target.name, values,
        rawConfig: input.rawConfig, allowDeleted: true, markUndeleted: Boolean(config.deletedAt),
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: configIdSchema, expectedRevision: z.number().int().nonnegative(), mutationId: mutationIdSchema }))
    .mutation(async ({ ctx, input }) => {
      await enforceConfigMutationRateLimit(ctx);
      return appendRevision({ ...input, userId: ctx.userId, kind: "delete", markDeleted: true });
    }),

  trash: protectedProcedure.query(async ({ ctx }) => {
    const rows = await db.select(configMetadataSelection).from(configs)
      .where(and(eq(configs.userId, ctx.userId), isNotNull(configs.deletedAt)))
      .orderBy(desc(configs.deletedAt));
    return rows.map(serializeMetadata);
  }),

  undelete: protectedProcedure
    .input(z.object({ id: configIdSchema, expectedRevision: z.number().int().nonnegative(), mutationId: mutationIdSchema }))
    .mutation(async ({ ctx, input }) => {
      await enforceConfigMutationRateLimit(ctx);
      return appendRevision({
        ...input, userId: ctx.userId, kind: "undelete", allowDeleted: true, markUndeleted: true,
      });
    }),

  permanentDelete: protectedProcedure
    .input(z.object({ id: configIdSchema }))
    .mutation(async ({ ctx, input }) => {
      await enforceConfigMutationRateLimit(ctx);
      const [row] = await db.delete(configs)
        .where(and(eq(configs.id, input.id), eq(configs.userId, ctx.userId), isNotNull(configs.deletedAt)))
        .returning({ id: configs.id });
      if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Config nicht im Papierkorb gefunden." });
      return row;
    }),
});
