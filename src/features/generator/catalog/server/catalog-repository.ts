import "server-only";

import { asc, eq } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { db } from "@/db";
import { commandDefinitions } from "@/db/schema";
import {
  commandCatalogInputSchema,
  type CommandCatalogRecord,
  type CommandCatalogSnapshot,
} from "../model";

export const COMMAND_CATALOG_CACHE_TAG = "command-catalog";

async function queryPublishedCatalog() {
  const rows = await db
    .select()
    .from(commandDefinitions)
    .where(eq(commandDefinitions.published, true))
    .orderBy(asc(commandDefinitions.sortOrder), asc(commandDefinitions.name));
  return createSnapshot(rows.map(mapCommandRow));
}

const readPublishedCatalog = unstable_cache(
  queryPublishedCatalog,
  ["published-command-catalog-v1"],
  { tags: [COMMAND_CATALOG_CACHE_TAG], revalidate: 60 },
);

export function getPublishedCommandCatalog() {
  // Direct tRPC callers in integration tests do not provide Next's incremental
  // cache context; production requests always use the shared tagged cache.
  return process.env.NODE_ENV === "test" ? queryPublishedCatalog() : readPublishedCatalog();
}

export async function getAdminCommandCatalog(): Promise<CommandCatalogSnapshot> {
  const rows = await db
    .select()
    .from(commandDefinitions)
    .orderBy(asc(commandDefinitions.sortOrder), asc(commandDefinitions.name));
  return createSnapshot(rows.map(mapCommandRow));
}

function createSnapshot(commands: CommandCatalogRecord[]): CommandCatalogSnapshot {
  const newest = commands.reduce((latest, command) => command.updatedAt > latest ? command.updatedAt : latest, "");
  return { version: newest || "empty", commands };
}

function mapCommandRow(row: typeof commandDefinitions.$inferSelect): CommandCatalogRecord {
  const candidate = {
    id: row.id,
    name: row.name,
    category: row.category,
    type: row.controlType,
    label: { de: row.labelDe, en: row.labelEn },
    description: { de: row.descriptionDe, en: row.descriptionEn },
    defaultValue: row.defaultValue,
    enabledByDefault: row.enabledByDefault,
    min: row.min ?? undefined,
    max: row.max ?? undefined,
    step: row.step ?? undefined,
    unit: row.unit ?? undefined,
    options: row.options,
    preview: row.preview ?? undefined,
    verification: row.verification,
    restrictions: row.restrictions,
    checkedVersion: row.checkedVersion,
    configTypes: row.configTypes,
    sortOrder: row.sortOrder,
    published: row.published,
    revision: row.revision,
  };
  const parsed = commandCatalogInputSchema.safeParse(candidate);
  if (!parsed.success) {
    throw new Error(`Ungültiger DB-Katalogeintrag ${row.name}: ${parsed.error.message}`);
  }
  return {
    ...parsed.data,
    id: row.id,
    revision: row.revision,
    options: parsed.data.options,
    status: {
      verification: parsed.data.verification,
      restrictions: parsed.data.restrictions,
      checkedVersion: parsed.data.checkedVersion,
    },
    updatedAt: row.updatedAt.toISOString(),
  };
}
