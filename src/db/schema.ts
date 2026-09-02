import { relations, sql } from "drizzle-orm";
import {
  boolean,
  doublePrecision,
  foreignKey,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import type { UserRole } from "@/features/auth/domain/roles";
import type { ConfigType } from "@/features/generator/domain/types";

export const users = pgTable(
  "users",
  {
    id: text("id").primaryKey(),
    name: text("name"),
    email: text("email"),
    emailVerified: timestamp("email_verified", { mode: "date" }),
    image: text("image"),
    passwordHash: text("password_hash"),
    role: text("role").$type<UserRole>().default("user").notNull(),
    /**
     * Public community identity. Deliberately separate from `name`, which comes
     * from Discord, Steam or the registration form: it is not unique, may carry
     * a real name and is not under the account holder's control.
     */
    handle: text("handle"),
    displayName: text("display_name"),
    handleChangedAt: timestamp("handle_changed_at", { mode: "date", withTimezone: true }),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("users_email_idx").on(table.email),
    uniqueIndex("users_handle_idx").on(table.handle),
  ],
);

export type StoredLocalizedText = { de: string; en: string };
export type StoredCommandOption = {
  value: string | number;
  label: StoredLocalizedText;
};

export const commandDefinitions = pgTable(
  "command_definitions",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    category: text("category").notNull(),
    controlType: text("control_type").notNull(),
    labelDe: text("label_de").notNull(),
    labelEn: text("label_en").notNull(),
    descriptionDe: text("description_de").notNull(),
    descriptionEn: text("description_en").notNull(),
    defaultValue: jsonb("default_value").$type<string | number | boolean>().notNull(),
    enabledByDefault: boolean("enabled_by_default").default(false).notNull(),
    min: doublePrecision("min"),
    max: doublePrecision("max"),
    step: doublePrecision("step"),
    unit: text("unit"),
    options: jsonb("options").$type<StoredCommandOption[]>().default([]).notNull(),
    preview: text("preview"),
    verification: text("verification").notNull(),
    restrictions: text("restrictions").array().default(sql`ARRAY[]::text[]`).notNull(),
    checkedVersion: text("checked_version").notNull(),
    configTypes: text("config_types").array().notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    published: boolean("published").default(false).notNull(),
    revision: integer("revision").default(1).notNull(),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("command_definitions_name_idx").on(table.name),
    index("command_definitions_public_idx").on(table.published, table.sortOrder),
    index("command_definitions_category_idx").on(table.category, table.sortOrder),
  ],
);

export const accounts = pgTable(
  "accounts",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (table) => [primaryKey({ columns: [table.provider, table.providerAccountId] })],
);

export const sessions = pgTable("sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (table) => [primaryKey({ columns: [table.identifier, table.token] })],
);

export const projects = pgTable(
  "projects",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    position: integer("position").default(0).notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("projects_user_name_idx").on(table.userId, table.name),
    index("projects_user_position_idx").on(table.userId, table.position),
  ],
);

export type ConfigValues = Record<string, unknown>;

export const configs = pgTable(
  "configs",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    projectId: text("project_id").references(() => projects.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    configType: text("config_type").notNull().default("matchmaking"),
    values: jsonb("values").$type<ConfigValues>().notNull(),
    rawConfig: text("raw_config").notNull(),
    revision: integer("revision").default(0).notNull(),
    contentHash: text("content_hash").default("").notNull(),
    deletedAt: timestamp("deleted_at", { mode: "date", withTimezone: true }),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("configs_user_name_idx").on(table.userId, table.name).where(sql`${table.deletedAt} is null`),
    index("configs_user_updated_idx").on(table.userId, table.updatedAt),
    index("configs_project_idx").on(table.projectId),
  ],
);

export type ConfigRevisionKind = "create" | "autosave" | "manual" | "rename" | "restore" | "delete" | "undelete";
export type StoredJsonPatch = Array<{
  op: "add" | "replace" | "remove";
  path: Array<string | number>;
  value?: unknown;
}>;

export const configRevisions = pgTable(
  "config_revisions",
  {
    id: text("id").primaryKey(),
    configId: text("config_id")
      .notNull()
      .references(() => configs.id, { onDelete: "cascade" }),
    revision: integer("revision").notNull(),
    parentRevision: integer("parent_revision"),
    kind: text("kind").$type<ConfigRevisionKind>().notNull(),
    name: text("name").notNull(),
    label: text("label"),
    snapshot: jsonb("snapshot").$type<ConfigValues>(),
    patch: jsonb("patch").$type<StoredJsonPatch>(),
    contentHash: text("content_hash").notNull(),
    mutationId: text("mutation_id").notNull(),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("config_revisions_number_idx").on(table.configId, table.revision),
    uniqueIndex("config_revisions_mutation_idx").on(table.mutationId),
    index("config_revisions_time_idx").on(table.configId, table.createdAt),
  ],
);

export type CommunityPostKind = "config" | "project";
export type CommunityVisibility = "public" | "unlisted";
export type CommunityPostStatus = "draft" | "published" | "hidden" | "removed";

/**
 * A published file. The payload is copied, never referenced: the author keeps
 * editing their workspace config while everyone who adopted this post keeps the
 * exact bytes they adopted.
 */
export type PublishedFile = {
  name: string;
  configType: ConfigType;
  document: ConfigValues;
  rawConfig: string;
};

export const communityPosts = pgTable(
  "community_posts",
  {
    id: text("id").primaryKey(),
    authorId: text("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: text("kind").$type<CommunityPostKind>().notNull(),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    summary: text("summary").notNull(),
    tags: text("tags").array().default(sql`ARRAY[]::text[]`).notNull(),
    configTypes: text("config_types").array().default(sql`ARRAY[]::text[]`).notNull(),
    visibility: text("visibility").$type<CommunityVisibility>().default("public").notNull(),
    status: text("status").$type<CommunityPostStatus>().default("published").notNull(),
    currentVersion: integer("current_version").default(1).notNull(),
    likeCount: integer("like_count").default(0).notNull(),
    adoptCount: integer("adopt_count").default(0).notNull(),
    commentCount: integer("comment_count").default(0).notNull(),
    publishedAt: timestamp("published_at", { mode: "date", withTimezone: true }),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp("deleted_at", { mode: "date", withTimezone: true }),
  },
  (table) => [
    uniqueIndex("community_posts_slug_idx").on(table.slug),
    index("community_posts_feed_idx").on(table.status, table.visibility, table.publishedAt),
    index("community_posts_author_idx").on(table.authorId, table.updatedAt),
    index("community_posts_tags_idx").using("gin", table.tags),
  ],
);

export const communityPostVersions = pgTable(
  "community_post_versions",
  {
    id: text("id").primaryKey(),
    postId: text("post_id")
      .notNull()
      .references(() => communityPosts.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    changelog: text("changelog"),
    files: jsonb("files").$type<PublishedFile[]>().notNull(),
    contentHash: text("content_hash").notNull(),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("community_post_versions_number_idx").on(table.postId, table.version),
    index("community_post_versions_hash_idx").on(table.contentHash),
  ],
);

export type CommunityCommentStatus = "visible" | "hidden" | "removed";

export const communityComments = pgTable(
  "community_comments",
  {
    id: text("id").primaryKey(),
    postId: text("post_id")
      .notNull()
      .references(() => communityPosts.id, { onDelete: "cascade" }),
    authorId: text("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    parentId: text("parent_id"),
    body: text("body").notNull(),
    status: text("status").$type<CommunityCommentStatus>().default("visible").notNull(),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true }).defaultNow().notNull(),
    editedAt: timestamp("edited_at", { mode: "date", withTimezone: true }),
  },
  (table) => [
    index("community_comments_post_idx").on(table.postId, table.createdAt),
    index("community_comments_author_idx").on(table.authorId, table.createdAt),
    // Replies never outlive the comment they answer.
    foreignKey({
      columns: [table.parentId],
      foreignColumns: [table.id],
      name: "community_comments_parent_fk",
    }).onDelete("cascade"),
  ],
);

export const communityReactions = pgTable(
  "community_reactions",
  {
    postId: text("post_id")
      .notNull()
      .references(() => communityPosts.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: text("kind").default("like").notNull(),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.postId, table.userId] }),
    index("community_reactions_user_idx").on(table.userId, table.createdAt),
  ],
);

export const communityFollows = pgTable(
  "community_follows",
  {
    followerId: text("follower_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    followeeId: text("followee_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.followerId, table.followeeId] }),
    index("community_follows_followee_idx").on(table.followeeId, table.createdAt),
  ],
);

/**
 * Adoptions are counted once per account and version so a download loop cannot
 * inflate the number that decides what the feed promotes.
 */
export const communityAdoptions = pgTable(
  "community_adoptions",
  {
    postId: text("post_id")
      .notNull()
      .references(() => communityPosts.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [primaryKey({ columns: [table.postId, table.userId, table.version] })],
);

export type ReportTargetType = "post" | "comment" | "user";
export type ReportSource = "user" | "system";
export type ReportReason =
  | "spam"
  | "cheat_or_exploit"
  | "harassment"
  | "sexual_or_violent"
  | "impersonation"
  | "illegal"
  | "other";
export type ReportStatus = "open" | "in_review" | "resolved" | "rejected";

export const contentReports = pgTable(
  "content_reports",
  {
    id: text("id").primaryKey(),
    targetType: text("target_type").$type<ReportTargetType>().notNull(),
    targetId: text("target_id").notNull(),
    targetAuthorId: text("target_author_id").references(() => users.id, { onDelete: "cascade" }),
    reporterId: text("reporter_id").references(() => users.id, { onDelete: "set null" }),
    source: text("source").$type<ReportSource>().default("user").notNull(),
    reason: text("reason").$type<ReportReason>().notNull(),
    note: text("note"),
    status: text("status").$type<ReportStatus>().default("open").notNull(),
    assignedTo: text("assigned_to").references(() => users.id, { onDelete: "set null" }),
    resolutionAction: text("resolution_action"),
    resolvedAt: timestamp("resolved_at", { mode: "date", withTimezone: true }),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("content_reports_queue_idx").on(table.status, table.createdAt),
    index("content_reports_target_idx").on(table.targetType, table.targetId),
    // One open report per person and target. Re-reporting the same thing is
    // noise in the queue, not a stronger signal.
    uniqueIndex("content_reports_open_idx")
      .on(table.reporterId, table.targetType, table.targetId)
      .where(sql`${table.status} in ('open', 'in_review') and ${table.reporterId} is not null`),
  ],
);

export type ModerationActionKind =
  | "hide"
  | "unhide"
  | "remove"
  | "restore"
  | "dismiss_report"
  | "edit_metadata"
  | "warn"
  | "mute"
  | "publish_ban"
  | "ban"
  | "unban";

/**
 * Append-only. Nothing in the application updates or deletes a row here — the
 * log is what makes a moderation decision reviewable after the fact.
 */
export const moderationActions = pgTable(
  "moderation_actions",
  {
    id: text("id").primaryKey(),
    moderatorId: text("moderator_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    action: text("action").$type<ModerationActionKind>().notNull(),
    targetType: text("target_type").$type<ReportTargetType>().notNull(),
    targetId: text("target_id").notNull(),
    reportId: text("report_id").references(() => contentReports.id, { onDelete: "set null" }),
    reason: text("reason").notNull(),
    note: text("note"),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("moderation_actions_target_idx").on(table.targetType, table.targetId, table.createdAt),
    index("moderation_actions_time_idx").on(table.createdAt),
  ],
);

export type SanctionKind = "mute" | "publish_ban" | "ban";

export const userSanctions = pgTable(
  "user_sanctions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: text("kind").$type<SanctionKind>().notNull(),
    reason: text("reason").notNull(),
    issuedBy: text("issued_by").references(() => users.id, { onDelete: "set null" }),
    expiresAt: timestamp("expires_at", { mode: "date", withTimezone: true }),
    revokedAt: timestamp("revoked_at", { mode: "date", withTimezone: true }),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("user_sanctions_active_idx").on(table.userId, table.revokedAt, table.expiresAt)],
);

export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
  sessions: many(sessions),
  configs: many(configs),
  projects: many(projects),
  posts: many(communityPosts),
  comments: many(communityComments),
  sanctions: many(userSanctions),
}));

export const communityPostsRelations = relations(communityPosts, ({ one, many }) => ({
  author: one(users, { fields: [communityPosts.authorId], references: [users.id] }),
  versions: many(communityPostVersions),
  comments: many(communityComments),
}));

export const communityPostVersionsRelations = relations(communityPostVersions, ({ one }) => ({
  post: one(communityPosts, { fields: [communityPostVersions.postId], references: [communityPosts.id] }),
}));

export const communityCommentsRelations = relations(communityComments, ({ one }) => ({
  post: one(communityPosts, { fields: [communityComments.postId], references: [communityPosts.id] }),
  author: one(users, { fields: [communityComments.authorId], references: [users.id] }),
}));

export const contentReportsRelations = relations(contentReports, ({ one }) => ({
  reporter: one(users, { fields: [contentReports.reporterId], references: [users.id] }),
  assignee: one(users, { fields: [contentReports.assignedTo], references: [users.id] }),
}));

export const moderationActionsRelations = relations(moderationActions, ({ one }) => ({
  moderator: one(users, { fields: [moderationActions.moderatorId], references: [users.id] }),
  report: one(contentReports, { fields: [moderationActions.reportId], references: [contentReports.id] }),
}));

export const userSanctionsRelations = relations(userSanctions, ({ one }) => ({
  user: one(users, { fields: [userSanctions.userId], references: [users.id] }),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, { fields: [accounts.userId], references: [users.id] }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  user: one(users, { fields: [projects.userId], references: [users.id] }),
  configs: many(configs),
}));

export const configsRelations = relations(configs, ({ one }) => ({
  user: one(users, { fields: [configs.userId], references: [users.id] }),
  project: one(projects, { fields: [configs.projectId], references: [projects.id] }),
}));

export const configRevisionsRelations = relations(configRevisions, ({ one }) => ({
  config: one(configs, { fields: [configRevisions.configId], references: [configs.id] }),
}));
