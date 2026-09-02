import "server-only";

import { createHash } from "node:crypto";
import { and, desc, eq, ilike, inArray, isNull, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { communityPosts, communityPostVersions, users, type PublishedFile } from "@/db/schema";
import type { ConfigType } from "@/features/generator/domain/types";
import { toPublicAuthor } from "../domain/identity";
import type { CommunityPostStatus, FeedScope, PublishedFileInput } from "../domain/post";
import { rankingGravity, rankingOffsetHours, rankingWeights } from "../domain/ranking";

export const feedPageSize = 24;

export function hashFiles(files: PublishedFileInput[] | PublishedFile[]) {
  return createHash("sha256").update(JSON.stringify(files)).digest("hex");
}

/**
 * The decay ranking from `ranking.ts`, expressed once for the database. Kept
 * next to the pure function it mirrors so the two cannot drift unnoticed.
 */
const trendingExpression = sql`(
  ${communityPosts.likeCount} * ${rankingWeights.like}
  + ${communityPosts.adoptCount} * ${rankingWeights.adopt}
  + ${communityPosts.commentCount} * ${rankingWeights.comment}
) / power(
  greatest(extract(epoch from (now() - coalesce(${communityPosts.publishedAt}, ${communityPosts.createdAt}))) / 3600, 0)
  + ${rankingOffsetHours},
  ${rankingGravity}
)`;

const authorSelection = {
  authorHandle: users.handle,
  authorDisplayName: users.displayName,
  authorName: users.name,
  authorImage: users.image,
};

const postSelection = {
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
  ...authorSelection,
};

export type SerializedPost = ReturnType<typeof serializePost>;

export function serializePost(row: {
  id: string;
  authorId: string;
  kind: string;
  slug: string;
  title: string;
  summary: string;
  tags: string[];
  configTypes: string[];
  visibility: string;
  status: string;
  currentVersion: number;
  likeCount: number;
  adoptCount: number;
  commentCount: number;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  authorHandle: string | null;
  authorDisplayName: string | null;
  authorName: string | null;
  authorImage: string | null;
}) {
  return {
    id: row.id,
    kind: row.kind as "config" | "project",
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    tags: row.tags,
    configTypes: row.configTypes as ConfigType[],
    visibility: row.visibility as "public" | "unlisted",
    status: row.status as CommunityPostStatus,
    currentVersion: row.currentVersion,
    likeCount: row.likeCount,
    adoptCount: row.adoptCount,
    commentCount: row.commentCount,
    publishedAt: row.publishedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    author: toPublicAuthor({
      handle: row.authorHandle,
      displayName: row.authorDisplayName,
      name: row.authorName,
      image: row.authorImage,
    }),
  };
}

export type FeedFilter = {
  scope: FeedScope;
  configType?: ConfigType;
  tag?: string;
  query?: string;
  followedIds?: string[];
  offset: number;
  limit: number;
};

/** Only ever returns what an anonymous visitor is allowed to see. */
export function publicPostFilter(): SQL {
  return and(
    eq(communityPosts.status, "published"),
    eq(communityPosts.visibility, "public"),
    isNull(communityPosts.deletedAt),
  )!;
}

export async function queryFeed(filter: FeedFilter) {
  const conditions: SQL[] = [publicPostFilter()];

  if (filter.configType) {
    conditions.push(sql`${communityPosts.configTypes} @> ARRAY[${filter.configType}]::text[]`);
  }
  if (filter.tag) {
    conditions.push(sql`${communityPosts.tags} @> ARRAY[${filter.tag}]::text[]`);
  }
  if (filter.query) {
    const pattern = `%${filter.query.replace(/[%_]/g, (match) => `\\${match}`)}%`;
    conditions.push(or(
      ilike(communityPosts.title, pattern),
      ilike(communityPosts.summary, pattern),
      sql`array_to_string(${communityPosts.tags}, ' ') ilike ${pattern}`,
      ilike(users.handle, pattern),
      ilike(users.displayName, pattern),
    )!);
  }
  if (filter.scope === "following") {
    if (!filter.followedIds?.length) return [];
    conditions.push(inArray(communityPosts.authorId, filter.followedIds));
  }

  const order = filter.scope === "trending"
    ? [desc(trendingExpression), desc(communityPosts.publishedAt)]
    : filter.scope === "top"
      ? [desc(communityPosts.adoptCount), desc(communityPosts.likeCount), desc(communityPosts.publishedAt)]
      : [desc(communityPosts.publishedAt), desc(communityPosts.id)];

  const rows = await db
    .select(postSelection)
    .from(communityPosts)
    .leftJoin(users, eq(users.id, communityPosts.authorId))
    .where(and(...conditions))
    .orderBy(...order)
    .limit(filter.limit)
    .offset(filter.offset);

  return rows.map(serializePost);
}

export async function findPostBySlug(slug: string) {
  const [row] = await db
    .select(postSelection)
    .from(communityPosts)
    .leftJoin(users, eq(users.id, communityPosts.authorId))
    .where(eq(communityPosts.slug, slug))
    .limit(1);
  return row ? serializePost(row) : null;
}

export async function findVersion(postId: string, version: number) {
  const [row] = await db
    .select()
    .from(communityPostVersions)
    .where(and(eq(communityPostVersions.postId, postId), eq(communityPostVersions.version, version)))
    .limit(1);
  return row ?? null;
}
