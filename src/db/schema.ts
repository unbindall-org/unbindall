import { relations, sql } from "drizzle-orm";
import {
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const users = pgTable(
  "users",
  {
    id: text("id").primaryKey(),
    name: text("name"),
    email: text("email"),
    emailVerified: timestamp("email_verified", { mode: "date" }),
    image: text("image"),
    passwordHash: text("password_hash"),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex("users_email_idx").on(table.email)],
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

export type ConfigValues = Record<string, unknown>;

export const configs = pgTable(
  "configs",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
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

export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
  sessions: many(sessions),
  configs: many(configs),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, { fields: [accounts.userId], references: [users.id] }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

export const configsRelations = relations(configs, ({ one }) => ({
  user: one(users, { fields: [configs.userId], references: [users.id] }),
}));

export const configRevisionsRelations = relations(configRevisions, ({ one }) => ({
  config: one(configs, { fields: [configRevisions.configId], references: [configs.id] }),
}));
