import { TRPCError } from "@trpc/server";
import { and, count, desc, eq, gte, inArray, isNull, or, sql, gt } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import {
  communityComments,
  communityPosts,
  contentReports,
  moderationActions,
  users,
  userSanctions,
} from "@/db/schema";
import { toPublicAuthor } from "@/features/community/domain/identity";
import {
  isActionAllowed,
  moderationActionKinds,
  noteSchema,
  reasonSchema,
  reportStatuses,
  reportTargetTypes,
  sanctionForAction,
  type ModerationActionKind,
  type ReportTargetType,
} from "@/features/community/domain/moderation";
import { createTRPCRouter, moderatorProcedure } from "@/trpc/init";

const reportIdSchema = z.string().uuid();

function startOfToday() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

async function describeTarget(targetType: ReportTargetType, targetId: string) {
  if (targetType === "post") {
    const [row] = await db.select({
      id: communityPosts.id,
      slug: communityPosts.slug,
      title: communityPosts.title,
      summary: communityPosts.summary,
      status: communityPosts.status,
      tags: communityPosts.tags,
      authorId: communityPosts.authorId,
    }).from(communityPosts).where(eq(communityPosts.id, targetId)).limit(1);
    if (!row) return null;
    return {
      kind: "post" as const,
      id: row.id,
      title: row.title,
      body: row.summary,
      status: row.status,
      slug: row.slug,
      tags: row.tags,
      authorId: row.authorId,
    };
  }

  if (targetType === "comment") {
    const [row] = await db.select({
      id: communityComments.id,
      body: communityComments.body,
      status: communityComments.status,
      authorId: communityComments.authorId,
      postId: communityComments.postId,
      slug: communityPosts.slug,
      title: communityPosts.title,
    })
      .from(communityComments)
      .leftJoin(communityPosts, eq(communityPosts.id, communityComments.postId))
      .where(eq(communityComments.id, targetId))
      .limit(1);
    if (!row) return null;
    return {
      kind: "comment" as const,
      id: row.id,
      title: row.title ?? "",
      body: row.body,
      status: row.status,
      slug: row.slug ?? null,
      tags: [] as string[],
      authorId: row.authorId,
    };
  }

  const [row] = await db.select({ id: users.id, handle: users.handle, displayName: users.displayName, name: users.name })
    .from(users).where(eq(users.id, targetId)).limit(1);
  if (!row) return null;
  return {
    kind: "user" as const,
    id: row.id,
    title: row.handle ?? row.name ?? row.id,
    body: row.displayName ?? "",
    status: "active",
    slug: row.handle,
    tags: [] as string[],
    authorId: row.id,
  };
}

async function activeSanctions(userId: string) {
  return db.select({
    id: userSanctions.id,
    kind: userSanctions.kind,
    reason: userSanctions.reason,
    expiresAt: userSanctions.expiresAt,
    createdAt: userSanctions.createdAt,
  }).from(userSanctions).where(and(
    eq(userSanctions.userId, userId),
    isNull(userSanctions.revokedAt),
    or(isNull(userSanctions.expiresAt), gt(userSanctions.expiresAt, new Date())),
  ));
}

/**
 * Applies the decision and writes the audit entry in one transaction. There is
 * no path in this application that changes moderated content without leaving a
 * row in `moderation_actions`.
 */
async function applyAction(input: {
  moderatorId: string;
  action: ModerationActionKind;
  targetType: ReportTargetType;
  targetId: string;
  reason: string;
  note?: string;
  reportId?: string;
  expiresInDays?: number;
}) {
  return db.transaction(async (tx) => {
    if (input.targetType === "post" && input.action !== "dismiss_report") {
      const status = input.action === "hide" ? "hidden"
        : input.action === "remove" ? "removed"
        : input.action === "unhide" || input.action === "restore" ? "published"
        : null;
      if (status) {
        const [row] = await tx.update(communityPosts)
          .set({ status, updatedAt: new Date() })
          .where(eq(communityPosts.id, input.targetId))
          .returning({ id: communityPosts.id });
        if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Beitrag nicht gefunden." });
      }
    }

    if (input.targetType === "comment" && input.action !== "dismiss_report") {
      const status = input.action === "hide" ? "hidden"
        : input.action === "remove" ? "removed"
        : input.action === "unhide" || input.action === "restore" ? "visible"
        : null;
      if (status) {
        const [row] = await tx.update(communityComments)
          .set({ status, ...(status === "removed" ? { body: "" } : {}), updatedAt: new Date() })
          .where(eq(communityComments.id, input.targetId))
          .returning({ id: communityComments.id, postId: communityComments.postId });
        if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Kommentar nicht gefunden." });
        if (status !== "visible") {
          await tx.update(communityPosts)
            .set({ commentCount: sql`greatest(${communityPosts.commentCount} - 1, 0)` })
            .where(eq(communityPosts.id, row.postId));
        }
      }
    }

    const sanction = sanctionForAction[input.action];
    if (sanction) {
      await tx.insert(userSanctions).values({
        id: crypto.randomUUID(),
        userId: input.targetId,
        kind: sanction,
        reason: input.reason,
        issuedBy: input.moderatorId,
        expiresAt: input.expiresInDays
          ? new Date(Date.now() + input.expiresInDays * 24 * 60 * 60 * 1_000)
          : null,
      });
    }
    if (input.action === "unban") {
      await tx.update(userSanctions)
        .set({ revokedAt: new Date() })
        .where(and(eq(userSanctions.userId, input.targetId), isNull(userSanctions.revokedAt)));
    }

    if (input.reportId) {
      await tx.update(contentReports).set({
        status: input.action === "dismiss_report" ? "rejected" : "resolved",
        resolutionAction: input.action,
        resolvedAt: new Date(),
        assignedTo: input.moderatorId,
      }).where(eq(contentReports.id, input.reportId));
    }

    const [logged] = await tx.insert(moderationActions).values({
      id: crypto.randomUUID(),
      moderatorId: input.moderatorId,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId,
      reportId: input.reportId ?? null,
      reason: input.reason,
      note: input.note ?? null,
    }).returning({ id: moderationActions.id, createdAt: moderationActions.createdAt });

    return logged;
  });
}

export const moderationRouter = createTRPCRouter({
  stats: moderatorProcedure.query(async () => {
    const [[open], [inReview], [today]] = await Promise.all([
      db.select({ value: count() }).from(contentReports).where(eq(contentReports.status, "open")),
      db.select({ value: count() }).from(contentReports).where(eq(contentReports.status, "in_review")),
      db.select({ value: count() }).from(moderationActions).where(gte(moderationActions.createdAt, startOfToday())),
    ]);
    return { open: open.value, inReview: inReview.value, handledToday: today.value };
  }),

  queue: moderatorProcedure
    .input(z.object({
      status: z.enum(reportStatuses).optional(),
      targetType: z.enum(reportTargetTypes).optional(),
      limit: z.number().int().min(1).max(100).default(50),
    }).default({ limit: 50 }))
    .query(async ({ input }) => {
      const conditions = [
        input.status
          ? eq(contentReports.status, input.status)
          : inArray(contentReports.status, ["open", "in_review"]),
      ];
      if (input.targetType) conditions.push(eq(contentReports.targetType, input.targetType));

      const rows = await db.select({
        id: contentReports.id,
        targetType: contentReports.targetType,
        targetId: contentReports.targetId,
        targetAuthorId: contentReports.targetAuthorId,
        source: contentReports.source,
        reason: contentReports.reason,
        note: contentReports.note,
        status: contentReports.status,
        assignedTo: contentReports.assignedTo,
        createdAt: contentReports.createdAt,
        reporterHandle: users.handle,
        reporterDisplayName: users.displayName,
        reporterName: users.name,
        reporterImage: users.image,
      })
        .from(contentReports)
        .leftJoin(users, eq(users.id, contentReports.reporterId))
        .where(and(...conditions))
        .orderBy(desc(contentReports.createdAt))
        .limit(input.limit);

      const targets = await Promise.all(rows.map((row) => describeTarget(row.targetType, row.targetId)));

      return rows.map((row, index) => ({
        id: row.id,
        targetType: row.targetType,
        targetId: row.targetId,
        source: row.source,
        reason: row.reason,
        note: row.note,
        status: row.status,
        assignedTo: row.assignedTo,
        createdAt: row.createdAt.toISOString(),
        reporter: row.source === "system" ? null : toPublicAuthor({
          handle: row.reporterHandle,
          displayName: row.reporterDisplayName,
          name: row.reporterName,
          image: row.reporterImage,
        }),
        target: targets[index],
      }));
    }),

  report: moderatorProcedure
    .input(z.object({ id: reportIdSchema }))
    .query(async ({ input }) => {
      const [row] = await db.select().from(contentReports).where(eq(contentReports.id, input.id)).limit(1);
      if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Meldung nicht gefunden." });

      const target = await describeTarget(row.targetType, row.targetId);
      const authorId = target?.authorId ?? row.targetAuthorId;

      const [history, standing] = await Promise.all([
        db.select({
          id: moderationActions.id,
          action: moderationActions.action,
          reason: moderationActions.reason,
          note: moderationActions.note,
          createdAt: moderationActions.createdAt,
          moderatorHandle: users.handle,
          moderatorName: users.name,
        })
          .from(moderationActions)
          .leftJoin(users, eq(users.id, moderationActions.moderatorId))
          .where(and(
            eq(moderationActions.targetType, row.targetType),
            eq(moderationActions.targetId, row.targetId),
          ))
          .orderBy(desc(moderationActions.createdAt))
          .limit(20),
        authorId ? loadUserStanding(authorId) : Promise.resolve(null),
      ]);

      return {
        report: {
          id: row.id,
          targetType: row.targetType,
          targetId: row.targetId,
          source: row.source,
          reason: row.reason,
          note: row.note,
          status: row.status,
          assignedTo: row.assignedTo,
          createdAt: row.createdAt.toISOString(),
        },
        target,
        author: standing,
        history: history.map((entry) => ({
          id: entry.id,
          action: entry.action,
          reason: entry.reason,
          note: entry.note,
          createdAt: entry.createdAt.toISOString(),
          moderator: entry.moderatorHandle ?? entry.moderatorName ?? "Team",
        })),
      };
    }),

  assign: moderatorProcedure
    .input(z.object({ id: reportIdSchema }))
    .mutation(async ({ ctx, input }) => {
      const [updated] = await db.update(contentReports)
        .set({ assignedTo: ctx.userId, status: "in_review" })
        .where(and(eq(contentReports.id, input.id), inArray(contentReports.status, ["open", "in_review"])))
        .returning({ id: contentReports.id });
      if (!updated) throw new TRPCError({ code: "NOT_FOUND", message: "Diese Meldung ist bereits abgeschlossen." });
      return { id: updated.id };
    }),

  act: moderatorProcedure
    .input(z.object({
      reportId: reportIdSchema.optional(),
      targetType: z.enum(reportTargetTypes),
      targetId: z.string().min(1).max(80),
      action: z.enum(moderationActionKinds),
      reason: reasonSchema,
      note: noteSchema,
      expiresInDays: z.number().int().min(1).max(3650).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!isActionAllowed(input.targetType, input.action)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Diese Aktion passt nicht zu diesem Inhalt." });
      }
      if (input.targetType === "user" && input.targetId === ctx.userId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Sanktionen gegen den eigenen Account sind nicht möglich." });
      }
      const logged = await applyAction({ ...input, moderatorId: ctx.userId });
      return { id: logged.id, createdAt: logged.createdAt.toISOString() };
    }),

  history: moderatorProcedure
    .input(z.object({
      targetType: z.enum(reportTargetTypes).optional(),
      targetId: z.string().max(80).optional(),
      limit: z.number().int().min(1).max(200).default(100),
    }).default({ limit: 100 }))
    .query(async ({ input }) => {
      const conditions = [];
      if (input.targetType) conditions.push(eq(moderationActions.targetType, input.targetType));
      if (input.targetId) conditions.push(eq(moderationActions.targetId, input.targetId));

      const rows = await db.select({
        id: moderationActions.id,
        action: moderationActions.action,
        targetType: moderationActions.targetType,
        targetId: moderationActions.targetId,
        reason: moderationActions.reason,
        note: moderationActions.note,
        createdAt: moderationActions.createdAt,
        moderatorHandle: users.handle,
        moderatorName: users.name,
      })
        .from(moderationActions)
        .leftJoin(users, eq(users.id, moderationActions.moderatorId))
        .where(conditions.length ? and(...conditions) : undefined)
        .orderBy(desc(moderationActions.createdAt))
        .limit(input.limit);

      return rows.map((row) => ({
        id: row.id,
        action: row.action,
        targetType: row.targetType,
        targetId: row.targetId,
        reason: row.reason,
        note: row.note,
        createdAt: row.createdAt.toISOString(),
        moderator: row.moderatorHandle ?? row.moderatorName ?? "Team",
      }));
    }),

  userStanding: moderatorProcedure
    .input(z.object({ userId: z.string().min(1).max(80) }))
    .query(({ input }) => loadUserStanding(input.userId)),
});

async function loadUserStanding(userId: string) {
  const [account] = await db.select({
    id: users.id,
    handle: users.handle,
    displayName: users.displayName,
    name: users.name,
    image: users.image,
    createdAt: users.createdAt,
  }).from(users).where(eq(users.id, userId)).limit(1);
  if (!account) return null;

  const [[posts], [priorActions], sanctions] = await Promise.all([
    db.select({ value: count() }).from(communityPosts).where(eq(communityPosts.authorId, userId)),
    db.select({ value: count() }).from(moderationActions)
      .where(and(eq(moderationActions.targetType, "user"), eq(moderationActions.targetId, userId))),
    activeSanctions(userId),
  ]);

  return {
    userId: account.id,
    author: toPublicAuthor(account),
    memberSince: account.createdAt.toISOString(),
    postCount: posts.value,
    priorActionCount: priorActions.value,
    sanctions: sanctions.map((row) => ({
      id: row.id,
      kind: row.kind,
      reason: row.reason,
      expiresAt: row.expiresAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
    })),
  };
}
