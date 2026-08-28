import { relations, sql } from "drizzle-orm";
import {
  boolean,
  doublePrecision,
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
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex("users_email_idx").on(table.email)],
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

export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
  sessions: many(sessions),
  configs: many(configs),
  projects: many(projects),
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
