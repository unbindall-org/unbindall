import { TRPCError } from "@trpc/server";
import { and, asc, count, desc, eq, isNull, ne, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import {
  communityAdoptions,
  communityComments,
  communityFollows,
  communityPosts,
  communityPostVersions,
  communityReactions,
  contentReports,
  users,
} from "@/db/schema";
import { canChangeHandle, displayNameSchema, handleSchema, toPublicAuthor } from "@/features/community/domain/identity";
import {
  changelogMaxLength,
  commentMaxLength,
  communityPostKinds,
  communityVisibilities,
  configTypesOf,
  createSlug,
  feedScopes,
  maxFilesPerPost,
  maxVersionBytes,
  measureFiles,
  publishedFileSchema,
  publishedPostQuota,
  randomSlugSuffix,
  summarySchema,
  tagsSchema,
  titleSchema,
} from "@/features/community/domain/post";
import {
  checkPublication,
  describeFindings,
  duplicateFinding,
  summarize,
  type PublishFinding,
} from "@/features/community/domain/publish-checks";
import { reportReasons, reportTargetTypes, reportNoteMaxLength } from "@/features/community/domain/moderation";
import {
  feedPageSize,
  findPostBySlug,
  findVersion,
  hashFiles,
  queryFeed,
  serializePost,
} from "@/features/community/server/post-repository";
import { assertCapability, loadStanding, requireHandle } from "@/features/community/server/standing";
import { localizeCatalog } from "@/features/generator/catalog/snapshot";
import { getPublishedCommandCatalog } from "@/features/generator/catalog/server/catalog-repository";
import { hasRole } from "@/features/auth/domain/roles";
import { CONFIG_TYPES } from "@/features/generator/domain/types";
import { isUniqueViolation } from "@/server/db-errors";
import { accountRateLimit, requestRateLimit } from "@/server/rate-limit";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "@/trpc/init";
import { enforceTRPCRateLimits } from "@/trpc/rate-limit";

const postIdSchema = z.string().uuid();
const slugSchema = z.string().trim().min(1).max(80);

async function viewerIsModerator(userId: string | undefined) {
  if (!userId) return false;
  const [row] = await db.select({ role: users.role }).from(users).where(eq(users.id, userId)).limit(1);
  return Boolean(row && hasRole(row.role, "moderator"));
}

/**
 * Unlisted posts are reachable by link, hidden ones only by their author and by
 * moderators, removed ones only by moderators. Everything else is a 404 — a
 * takedown must not be discoverable by probing slugs.
 */
function readablePost(
  post: { status: string; authorId?: string },
  viewer: { userId?: string; isModerator: boolean },
  authorId: string,
) {
  if (post.status === "published") return true;
  if (viewer.isModerator) return true;
  return post.status === "hidden" && viewer.userId === authorId;
}

async function loadOwnedPost(userId: string, id: string) {
  const [row] = await db.select().from(communityPosts)
    .where(and(eq(communityPosts.id, id), eq(communityPosts.authorId, userId), isNull(communityPosts.deletedAt)))
    .limit(1);
  if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Beitrag nicht gefunden." });
  if (row.status === "removed") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Dieser Beitrag wurde von der Moderation entfernt." });
  }
  return row;
}

async function runPublishChecks(
  files: Array<z.infer<typeof publishedFileSchema>>,
  text: { title: string; summary: string },
  authorId: string,
  contentHash: string,
) {
  const snapshot = await getPublishedCommandCatalog();
  const catalog = localizeCatalog(snapshot, "de");
  const base = checkPublication(files, text, catalog);
  const findings: PublishFinding[] = [...base.findings];

  const [duplicate] = await db
    .select({ slug: communityPosts.slug })
    .from(communityPostVersions)
    .innerJoin(communityPosts, eq(communityPosts.id, communityPostVersions.postId))
    .where(and(
      eq(communityPostVersions.contentHash, contentHash),
      ne(communityPosts.authorId, authorId),
      eq(communityPosts.status, "published"),
    ))
    .limit(1);
  if (duplicate) findings.push(duplicateFinding(duplicate.slug));

  return summarize(findings);
}

/** A blocked publish never reaches the database; a flagged one queues itself. */
async function fileSystemReport(postId: string, authorId: string, findings: PublishFinding[]) {
  await db.insert(contentReports).values({
    id: crypto.randomUUID(),
    targetType: "post",
    targetId: postId,
    targetAuthorId: authorId,
    reporterId: null,
    source: "system",
    reason: "other",
    note: describeFindings(findings).slice(0, reportNoteMaxLength),
    status: "open",
  });
}

async function enforcePublishRateLimit(ctx: { userId: string; request?: Request }) {
  await enforceTRPCRateLimits([
    accountRateLimit("communityPublishAccount", ctx.userId),
    requestRateLimit("communityPublishIp", ctx.request),
  ]);
}

async function viewerFlags(postId: string, authorId: string, userId?: string) {
  if (!userId) return { liked: false, following: false, isAuthor: false };
  const [[like], [follow]] = await Promise.all([
    db.select({ postId: communityReactions.postId }).from(communityReactions)
      .where(and(eq(communityReactions.postId, postId), eq(communityReactions.userId, userId))).limit(1),
    db.select({ followeeId: communityFollows.followeeId }).from(communityFollows)
      .where(and(eq(communityFollows.followerId, userId), eq(communityFollows.followeeId, authorId))).limit(1),
  ]);
  return { liked: Boolean(like), following: Boolean(follow), isAuthor: userId === authorId };
}

function serializeComment(row: {
  id: string;
  parentId: string | null;
  body: string;
  status: string;
  authorId: string;
  createdAt: Date;
  editedAt: Date | null;
  authorHandle: string | null;
  authorDisplayName: string | null;
  authorName: string | null;
  authorImage: string | null;
}) {
  const removed = row.status !== "visible";
  return {
    id: row.id,
    parentId: row.parentId,
    body: removed ? "" : row.body,
    status: row.status as "visible" | "hidden" | "removed",
    createdAt: row.createdAt.toISOString(),
    editedAt: row.editedAt?.toISOString() ?? null,
    author: toPublicAuthor({
      handle: row.authorHandle,
      displayName: row.authorDisplayName,
      name: row.authorName,
      image: row.authorImage,
    }),
    authorId: row.authorId,
  };
}

const commentSelection = {
  id: communityComments.id,
  parentId: communityComments.parentId,
  body: communityComments.body,
  status: communityComments.status,
  authorId: communityComments.authorId,
  createdAt: communityComments.createdAt,
  editedAt: communityComments.editedAt,
  authorHandle: users.handle,
  authorDisplayName: users.displayName,
  authorName: users.name,
  authorImage: users.image,
};

export const communityRouter = createTRPCRouter({
  /* ----------------------------------------------------------------- read */

  feed: publicProcedure
    .input(z.object({
      scope: z.enum(feedScopes).default("new"),
      configType: z.enum(CONFIG_TYPES).optional(),
      tag: z.string().trim().max(24).optional(),
      query: z.string().trim().max(80).optional(),
      cursor: z.number().int().nonnegative().default(0),
    }))
    .query(async ({ ctx, input }) => {
      await enforceTRPCRateLimits([requestRateLimit("communityReadIp", ctx.request)]);
      const userId = ctx.session?.user.id;

      let followedIds: string[] | undefined;
      if (input.scope === "following") {
        if (!userId) return { items: [], nextCursor: null };
        const follows = await db.select({ id: communityFollows.followeeId })
          .from(communityFollows).where(eq(communityFollows.followerId, userId));
        followedIds = follows.map((row) => row.id);
      }

      const items = await queryFeed({
        scope: input.scope,
        configType: input.configType,
        tag: input.tag,
        query: input.query || undefined,
        followedIds,
        offset: input.cursor,
        limit: feedPageSize,
      });

      return {
        items,
        nextCursor: items.length === feedPageSize ? input.cursor + feedPageSize : null,
      };
    }),

  bySlug: publicProcedure
    .input(z.object({ slug: slugSchema }))
    .query(async ({ ctx, input }) => {
      const post = await findPostBySlug(input.slug);
      const userId = ctx.session?.user.id;
      const isModerator = await viewerIsModerator(userId);
      if (!post) throw new TRPCError({ code: "NOT_FOUND", message: "Beitrag nicht gefunden." });

      const [owner] = await db.select({ authorId: communityPosts.authorId, deletedAt: communityPosts.deletedAt })
        .from(communityPosts).where(eq(communityPosts.id, post.id)).limit(1);
      if (!owner || (owner.deletedAt && !isModerator)) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Beitrag nicht gefunden." });
      }
      if (!readablePost(post, { userId, isModerator }, owner.authorId)) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Beitrag nicht gefunden." });
      }

      const [version, viewer, versions] = await Promise.all([
        findVersion(post.id, post.currentVersion),
        viewerFlags(post.id, owner.authorId, userId),
        db.select({
          version: communityPostVersions.version,
          changelog: communityPostVersions.changelog,
          createdAt: communityPostVersions.createdAt,
        }).from(communityPostVersions)
          .where(eq(communityPostVersions.postId, post.id))
          .orderBy(desc(communityPostVersions.version)),
      ]);

      return {
        post,
        viewer,
        files: version?.files ?? [],
        versions: versions.map((row) => ({
          version: row.version,
          changelog: row.changelog,
          createdAt: row.createdAt.toISOString(),
        })),
      };
    }),

  version: publicProcedure
    .input(z.object({ slug: slugSchema, version: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const post = await findPostBySlug(input.slug);
      if (!post) throw new TRPCError({ code: "NOT_FOUND", message: "Beitrag nicht gefunden." });
      const isModerator = await viewerIsModerator(ctx.session?.user.id);
      const [owner] = await db.select({ authorId: communityPosts.authorId })
        .from(communityPosts).where(eq(communityPosts.id, post.id)).limit(1);
      if (!owner || !readablePost(post, { userId: ctx.session?.user.id, isModerator }, owner.authorId)) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Beitrag nicht gefunden." });
      }
      const version = await findVersion(post.id, input.version);
      if (!version) throw new TRPCError({ code: "NOT_FOUND", message: "Diese Version existiert nicht." });
      return {
        version: version.version,
        changelog: version.changelog,
        files: version.files,
        createdAt: version.createdAt.toISOString(),
      };
    }),

  comments: publicProcedure
    .input(z.object({ postId: postIdSchema }))
    .query(async ({ input }) => {
      const rows = await db
        .select(commentSelection)
        .from(communityComments)
        .leftJoin(users, eq(users.id, communityComments.authorId))
        .where(eq(communityComments.postId, input.postId))
        .orderBy(asc(communityComments.createdAt))
        .limit(300);
      return rows.map(serializeComment);
    }),

  profile: publicProcedure
    .input(z.object({ handle: z.string().trim().toLowerCase().max(24) }))
    .query(async ({ ctx, input }) => {
      const [account] = await db
        .select({
          id: users.id,
          handle: users.handle,
          displayName: users.displayName,
          name: users.name,
          image: users.image,
          createdAt: users.createdAt,
        })
        .from(users)
        .where(eq(users.handle, input.handle))
        .limit(1);
      if (!account) throw new TRPCError({ code: "NOT_FOUND", message: "Profil nicht gefunden." });

      const viewerId = ctx.session?.user.id;
      const [posts, [followers], [following], viewerFollow] = await Promise.all([
        db.select({
          id: communityPosts.id,
          authorId: communityPosts.authorId,
          kind: communityPosts.kind,
          slug: communityPosts.slug,
          title: communityPosts.title,
          summary: communityPosts.summary,
          tags: communityPosts.tags,
          configTypes: communityPosts.configTypes,
          visibility: communityPosts.visibility,
          status: communityPosts.status,
          currentVersion: communityPosts.currentVersion,
          likeCount: communityPosts.likeCount,
          adoptCount: communityPosts.adoptCount,
          commentCount: communityPosts.commentCount,
          publishedAt: communityPosts.publishedAt,
          createdAt: communityPosts.createdAt,
          updatedAt: communityPosts.updatedAt,
          authorHandle: users.handle,
          authorDisplayName: users.displayName,
          authorName: users.name,
          authorImage: users.image,
        })
          .from(communityPosts)
          .leftJoin(users, eq(users.id, communityPosts.authorId))
          .where(and(
            eq(communityPosts.authorId, account.id),
            eq(communityPosts.status, "published"),
            eq(communityPosts.visibility, "public"),
            isNull(communityPosts.deletedAt),
          ))
          .orderBy(desc(communityPosts.publishedAt))
          .limit(50),
        db.select({ value: count() }).from(communityFollows).where(eq(communityFollows.followeeId, account.id)),
        db.select({ value: count() }).from(communityFollows).where(eq(communityFollows.followerId, account.id)),
        viewerId
          ? db.select({ id: communityFollows.followeeId }).from(communityFollows)
              .where(and(eq(communityFollows.followerId, viewerId), eq(communityFollows.followeeId, account.id)))
              .limit(1)
          : Promise.resolve([]),
      ]);

      return {
        author: toPublicAuthor(account),
        memberSince: account.createdAt.toISOString(),
        followerCount: followers.value,
        followingCount: following.value,
        isSelf: viewerId === account.id,
        isFollowing: viewerFollow.length > 0,
        posts: posts.map(serializePost),
      };
    }),

  /* -------------------------------------------------------------- identity */

  myProfile: protectedProcedure.query(async ({ ctx }) => {
    const [account] = await db
      .select({
        handle: users.handle,
        displayName: users.displayName,
        name: users.name,
        image: users.image,
        handleChangedAt: users.handleChangedAt,
      })
      .from(users)
      .where(eq(users.id, ctx.userId))
      .limit(1);
    if (!account) throw new TRPCError({ code: "NOT_FOUND", message: "Account nicht gefunden." });

    const standing = await loadStanding(ctx.userId);
    return {
      handle: account.handle,
      displayName: account.displayName ?? account.name ?? null,
      image: account.image,
      canChangeHandle: canChangeHandle(account.handleChangedAt),
      handleChangedAt: account.handleChangedAt?.toISOString() ?? null,
      sanctions: standing.sanctions,
    };
  }),

  updateProfile: protectedProcedure
    .input(z.object({ handle: handleSchema.optional(), displayName: displayNameSchema.optional() }))
    .mutation(async ({ ctx, input }) => {
      await enforceTRPCRateLimits([accountRateLimit("handleChangeAccount", ctx.userId)]);
      const [account] = await db
        .select({ handle: users.handle, handleChangedAt: users.handleChangedAt })
        .from(users).where(eq(users.id, ctx.userId)).limit(1);
      if (!account) throw new TRPCError({ code: "NOT_FOUND", message: "Account nicht gefunden." });

      const patch: { handle?: string; displayName?: string; handleChangedAt?: Date; updatedAt: Date } = {
        updatedAt: new Date(),
      };

      if (input.handle && input.handle !== account.handle) {
        if (account.handle && !canChangeHandle(account.handleChangedAt)) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Ein Handle kann nur alle 30 Tage geändert werden.",
          });
        }
        patch.handle = input.handle;
        patch.handleChangedAt = new Date();
      }
      if (input.displayName) patch.displayName = input.displayName;

      try {
        const [updated] = await db.update(users).set(patch)
          .where(eq(users.id, ctx.userId))
          .returning({ handle: users.handle, displayName: users.displayName });
        return { handle: updated.handle, displayName: updated.displayName };
      } catch (error) {
        if (isUniqueViolation(error)) {
          throw new TRPCError({ code: "CONFLICT", message: "Dieser Handle ist bereits vergeben." });
        }
        throw error;
      }
    }),

  myPosts: protectedProcedure.query(async ({ ctx }) => {
    const rows = await db
      .select({
        id: communityPosts.id,
        authorId: communityPosts.authorId,
        kind: communityPosts.kind,
        slug: communityPosts.slug,
        title: communityPosts.title,
        summary: communityPosts.summary,
        tags: communityPosts.tags,
        configTypes: communityPosts.configTypes,
        visibility: communityPosts.visibility,
        status: communityPosts.status,
        currentVersion: communityPosts.currentVersion,
        likeCount: communityPosts.likeCount,
        adoptCount: communityPosts.adoptCount,
        commentCount: communityPosts.commentCount,
        publishedAt: communityPosts.publishedAt,
        createdAt: communityPosts.createdAt,
        updatedAt: communityPosts.updatedAt,
        authorHandle: users.handle,
        authorDisplayName: users.displayName,
        authorName: users.name,
        authorImage: users.image,
      })
      .from(communityPosts)
      .leftJoin(users, eq(users.id, communityPosts.authorId))
      .where(and(eq(communityPosts.authorId, ctx.userId), isNull(communityPosts.deletedAt)))
      .orderBy(desc(communityPosts.updatedAt));
    return rows.map(serializePost);
  }),

  /* ------------------------------------------------------------- publishing */

  publish: protectedProcedure
    .input(z.object({
      kind: z.enum(communityPostKinds),
      title: titleSchema,
      summary: summarySchema,
      tags: tagsSchema,
      visibility: z.enum(communityVisibilities).default("public"),
      files: z.array(publishedFileSchema).min(1).max(maxFilesPerPost),
    }))
    .mutation(async ({ ctx, input }) => {
      await enforcePublishRateLimit(ctx);
      const standing = await loadStanding(ctx.userId);
      assertCapability(standing, "publish");
      requireHandle(standing);

      if (input.kind === "config" && input.files.length !== 1) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Ein Config-Beitrag enthält genau eine Datei." });
      }
      const bytes = measureFiles(input.files);
      if (bytes > maxVersionBytes) {
        throw new TRPCError({ code: "PAYLOAD_TOO_LARGE", message: "Der Beitrag ist zu groß." });
      }

      const [usage] = await db.select({ value: count() }).from(communityPosts)
        .where(and(eq(communityPosts.authorId, ctx.userId), isNull(communityPosts.deletedAt)));
      if (usage.value >= publishedPostQuota) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: `Pro Account sind höchstens ${publishedPostQuota} Beiträge erlaubt.`,
        });
      }

      const contentHash = hashFiles(input.files);
      const checks = await runPublishChecks(input.files, input, ctx.userId, contentHash);
      if (checks.status === "blocked") {
        throw new TRPCError({ code: "BAD_REQUEST", message: describeFindings(checks.findings) });
      }

      const id = crypto.randomUUID();
      const now = new Date();
      const post = await db.transaction(async (tx) => {
        const [row] = await tx.insert(communityPosts).values({
          id,
          authorId: ctx.userId,
          kind: input.kind,
          slug: createSlug(input.title, randomSlugSuffix()),
          title: input.title,
          summary: input.summary,
          tags: input.tags,
          configTypes: configTypesOf(input.files),
          visibility: input.visibility,
          status: "published",
          currentVersion: 1,
          publishedAt: now,
        }).returning();

        await tx.insert(communityPostVersions).values({
          id: crypto.randomUUID(),
          postId: id,
          version: 1,
          changelog: null,
          files: input.files,
          contentHash,
        });
        return row;
      });

      if (checks.status === "flagged") await fileSystemReport(id, ctx.userId, checks.findings);

      return { slug: post.slug, id: post.id, findings: checks.findings };
    }),

  updatePost: protectedProcedure
    .input(z.object({
      id: postIdSchema,
      title: titleSchema,
      summary: summarySchema,
      tags: tagsSchema,
      visibility: z.enum(communityVisibilities),
    }))
    .mutation(async ({ ctx, input }) => {
      await enforcePublishRateLimit(ctx);
      const standing = await loadStanding(ctx.userId);
      assertCapability(standing, "publish");
      await loadOwnedPost(ctx.userId, input.id);

      const [updated] = await db.update(communityPosts).set({
        title: input.title,
        summary: input.summary,
        tags: input.tags,
        visibility: input.visibility,
        updatedAt: new Date(),
      }).where(and(eq(communityPosts.id, input.id), eq(communityPosts.authorId, ctx.userId)))
        .returning({ slug: communityPosts.slug });
      return { slug: updated.slug };
    }),

  publishVersion: protectedProcedure
    .input(z.object({
      id: postIdSchema,
      changelog: z.string().trim().max(changelogMaxLength).optional(),
      files: z.array(publishedFileSchema).min(1).max(maxFilesPerPost),
    }))
    .mutation(async ({ ctx, input }) => {
      await enforcePublishRateLimit(ctx);
      const standing = await loadStanding(ctx.userId);
      assertCapability(standing, "publish");
      const existing = await loadOwnedPost(ctx.userId, input.id);

      if (measureFiles(input.files) > maxVersionBytes) {
        throw new TRPCError({ code: "PAYLOAD_TOO_LARGE", message: "Der Beitrag ist zu groß." });
      }

      const contentHash = hashFiles(input.files);
      const checks = await runPublishChecks(
        input.files,
        { title: existing.title, summary: existing.summary },
        ctx.userId,
        contentHash,
      );
      if (checks.status === "blocked") {
        throw new TRPCError({ code: "BAD_REQUEST", message: describeFindings(checks.findings) });
      }

      const version = existing.currentVersion + 1;
      await db.transaction(async (tx) => {
        await tx.insert(communityPostVersions).values({
          id: crypto.randomUUID(),
          postId: input.id,
          version,
          changelog: input.changelog ?? null,
          files: input.files,
          contentHash,
        });
        // A new version never lifts a moderation decision.
        await tx.update(communityPosts).set({
          currentVersion: version,
          configTypes: configTypesOf(input.files),
          updatedAt: new Date(),
        }).where(eq(communityPosts.id, input.id));
      });

      if (checks.status === "flagged") await fileSystemReport(input.id, ctx.userId, checks.findings);
      return { version, findings: checks.findings };
    }),

  unpublish: protectedProcedure
    .input(z.object({ id: postIdSchema }))
    .mutation(async ({ ctx, input }) => {
      await loadOwnedPost(ctx.userId, input.id);
      await db.update(communityPosts)
        .set({ status: "draft", deletedAt: new Date(), updatedAt: new Date() })
        .where(and(eq(communityPosts.id, input.id), eq(communityPosts.authorId, ctx.userId)));
      return { id: input.id };
    }),

  /* ------------------------------------------------------------ interaction */

  like: protectedProcedure
    .input(z.object({ id: postIdSchema }))
    .mutation(async ({ ctx, input }) => {
      await enforceTRPCRateLimits([accountRateLimit("communityReactionAccount", ctx.userId)]);
      const standing = await loadStanding(ctx.userId);
      assertCapability(standing, "interact");

      return db.transaction(async (tx) => {
        const inserted = await tx.insert(communityReactions)
          .values({ postId: input.id, userId: ctx.userId, kind: "like" })
          .onConflictDoNothing()
          .returning({ postId: communityReactions.postId });
        if (!inserted.length) return { liked: true };
        const [row] = await tx.update(communityPosts)
          .set({ likeCount: sql`${communityPosts.likeCount} + 1` })
          .where(eq(communityPosts.id, input.id))
          .returning({ likeCount: communityPosts.likeCount });
        return { liked: true, likeCount: row?.likeCount };
      });
    }),

  unlike: protectedProcedure
    .input(z.object({ id: postIdSchema }))
    .mutation(async ({ ctx, input }) => {
      await enforceTRPCRateLimits([accountRateLimit("communityReactionAccount", ctx.userId)]);
      return db.transaction(async (tx) => {
        const removed = await tx.delete(communityReactions)
          .where(and(eq(communityReactions.postId, input.id), eq(communityReactions.userId, ctx.userId)))
          .returning({ postId: communityReactions.postId });
        if (!removed.length) return { liked: false };
        const [row] = await tx.update(communityPosts)
          .set({ likeCount: sql`greatest(${communityPosts.likeCount} - 1, 0)` })
          .where(eq(communityPosts.id, input.id))
          .returning({ likeCount: communityPosts.likeCount });
        return { liked: false, likeCount: row?.likeCount };
      });
    }),

  follow: protectedProcedure
    .input(z.object({ handle: z.string().trim().toLowerCase().max(24) }))
    .mutation(async ({ ctx, input }) => {
      await enforceTRPCRateLimits([accountRateLimit("communityReactionAccount", ctx.userId)]);
      const standing = await loadStanding(ctx.userId);
      assertCapability(standing, "interact");

      const [target] = await db.select({ id: users.id }).from(users).where(eq(users.handle, input.handle)).limit(1);
      if (!target) throw new TRPCError({ code: "NOT_FOUND", message: "Profil nicht gefunden." });
      if (target.id === ctx.userId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Du kannst dir nicht selbst folgen." });
      }
      await db.insert(communityFollows)
        .values({ followerId: ctx.userId, followeeId: target.id })
        .onConflictDoNothing();
      return { following: true };
    }),

  unfollow: protectedProcedure
    .input(z.object({ handle: z.string().trim().toLowerCase().max(24) }))
    .mutation(async ({ ctx, input }) => {
      const [target] = await db.select({ id: users.id }).from(users).where(eq(users.handle, input.handle)).limit(1);
      if (!target) throw new TRPCError({ code: "NOT_FOUND", message: "Profil nicht gefunden." });
      await db.delete(communityFollows)
        .where(and(eq(communityFollows.followerId, ctx.userId), eq(communityFollows.followeeId, target.id)));
      return { following: false };
    }),

  /** Counted once per account and version so a download loop cannot inflate it. */
  recordAdoption: protectedProcedure
    .input(z.object({ id: postIdSchema, version: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      return db.transaction(async (tx) => {
        const inserted = await tx.insert(communityAdoptions)
          .values({ postId: input.id, userId: ctx.userId, version: input.version })
          .onConflictDoNothing()
          .returning({ postId: communityAdoptions.postId });
        if (!inserted.length) return { counted: false };
        await tx.update(communityPosts)
          .set({ adoptCount: sql`${communityPosts.adoptCount} + 1` })
          .where(eq(communityPosts.id, input.id));
        return { counted: true };
      });
    }),

  /* --------------------------------------------------------------- comments */

  addComment: protectedProcedure
    .input(z.object({
      postId: postIdSchema,
      parentId: postIdSchema.optional(),
      body: z.string().trim().min(1, "Ein Kommentar darf nicht leer sein.").max(commentMaxLength),
    }))
    .mutation(async ({ ctx, input }) => {
      await enforceTRPCRateLimits([
        accountRateLimit("communityCommentAccount", ctx.userId),
        requestRateLimit("communityCommentIp", ctx.request),
      ]);
      const standing = await loadStanding(ctx.userId);
      assertCapability(standing, "comment");
      requireHandle(standing);

      const [post] = await db.select({ id: communityPosts.id, status: communityPosts.status })
        .from(communityPosts)
        .where(and(eq(communityPosts.id, input.postId), isNull(communityPosts.deletedAt)))
        .limit(1);
      if (!post || post.status !== "published") {
        throw new TRPCError({ code: "NOT_FOUND", message: "Beitrag nicht gefunden." });
      }

      if (input.parentId) {
        const [parent] = await db.select({ id: communityComments.id, parentId: communityComments.parentId })
          .from(communityComments)
          .where(and(eq(communityComments.id, input.parentId), eq(communityComments.postId, input.postId)))
          .limit(1);
        if (!parent) throw new TRPCError({ code: "NOT_FOUND", message: "Der Kommentar existiert nicht mehr." });
        // Exactly one reply level. A deeper thread is unreadable on a phone.
        if (parent.parentId) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Auf eine Antwort kann nicht erneut geantwortet werden." });
        }
      }

      const id = crypto.randomUUID();
      await db.transaction(async (tx) => {
        await tx.insert(communityComments).values({
          id,
          postId: input.postId,
          authorId: ctx.userId,
          parentId: input.parentId ?? null,
          body: input.body,
        });
        await tx.update(communityPosts)
          .set({ commentCount: sql`${communityPosts.commentCount} + 1` })
          .where(eq(communityPosts.id, input.postId));
      });
      return { id };
    }),

  editComment: protectedProcedure
    .input(z.object({ id: postIdSchema, body: z.string().trim().min(1).max(commentMaxLength) }))
    .mutation(async ({ ctx, input }) => {
      const [existing] = await db.select().from(communityComments)
        .where(and(eq(communityComments.id, input.id), eq(communityComments.authorId, ctx.userId)))
        .limit(1);
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Kommentar nicht gefunden." });
      if (existing.status !== "visible") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Dieser Kommentar kann nicht bearbeitet werden." });
      }
      // Fifteen minutes: long enough for a typo, short enough that a reply
      // cannot be rewritten after someone answered it.
      if (Date.now() - existing.createdAt.getTime() > 15 * 60_000) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Kommentare lassen sich nur 15 Minuten lang bearbeiten." });
      }
      await db.update(communityComments)
        .set({ body: input.body, editedAt: new Date(), updatedAt: new Date() })
        .where(eq(communityComments.id, input.id));
      return { id: input.id };
    }),

  deleteComment: protectedProcedure
    .input(z.object({ id: postIdSchema }))
    .mutation(async ({ ctx, input }) => {
      const [existing] = await db.select().from(communityComments)
        .where(and(eq(communityComments.id, input.id), eq(communityComments.authorId, ctx.userId)))
        .limit(1);
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Kommentar nicht gefunden." });
      if (existing.status === "removed") return { id: input.id };

      await db.transaction(async (tx) => {
        await tx.update(communityComments)
          .set({ status: "removed", body: "", updatedAt: new Date() })
          .where(eq(communityComments.id, input.id));
        await tx.update(communityPosts)
          .set({ commentCount: sql`greatest(${communityPosts.commentCount} - 1, 0)` })
          .where(eq(communityPosts.id, existing.postId));
      });
      return { id: input.id };
    }),

  /* ---------------------------------------------------------------- reports */

  report: protectedProcedure
    .input(z.object({
      targetType: z.enum(reportTargetTypes),
      targetId: z.string().min(1).max(80),
      reason: z.enum(reportReasons),
      note: z.string().trim().max(reportNoteMaxLength).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await enforceTRPCRateLimits([accountRateLimit("communityReportAccount", ctx.userId)]);
      const standing = await loadStanding(ctx.userId);
      assertCapability(standing, "interact");

      const targetAuthorId = await resolveTargetAuthor(input.targetType, input.targetId);
      if (!targetAuthorId) throw new TRPCError({ code: "NOT_FOUND", message: "Der gemeldete Inhalt existiert nicht." });
      if (targetAuthorId === ctx.userId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Eigene Inhalte lassen sich nicht melden." });
      }

      try {
        await db.insert(contentReports).values({
          id: crypto.randomUUID(),
          targetType: input.targetType,
          targetId: input.targetId,
          targetAuthorId,
          reporterId: ctx.userId,
          source: "user",
          reason: input.reason,
          note: input.note ?? null,
          status: "open",
        });
      } catch (error) {
        if (isUniqueViolation(error)) {
          // A second report on the same thing is noise in the queue, not a
          // stronger signal. Report it back as success.
          return { reported: true, duplicate: true };
        }
        throw error;
      }
      return { reported: true, duplicate: false };
    }),
});

async function resolveTargetAuthor(targetType: "post" | "comment" | "user", targetId: string) {
  if (targetType === "post") {
    const [row] = await db.select({ authorId: communityPosts.authorId })
      .from(communityPosts).where(eq(communityPosts.id, targetId)).limit(1);
    return row?.authorId ?? null;
  }
  if (targetType === "comment") {
    const [row] = await db.select({ authorId: communityComments.authorId })
      .from(communityComments).where(eq(communityComments.id, targetId)).limit(1);
    return row?.authorId ?? null;
  }
  const [row] = await db.select({ id: users.id }).from(users).where(eq(users.id, targetId)).limit(1);
  return row?.id ?? null;
}
