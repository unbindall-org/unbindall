import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { testSql } from "./database";

export default async function setup() {
  const sql = testSql();
  try {
    // This reset is deliberate: the migration suite must prove that every
    // checked-in migration works against a genuinely empty database.
    await sql.unsafe('DROP SCHEMA IF EXISTS "public" CASCADE');
    await sql.unsafe('DROP SCHEMA IF EXISTS "drizzle" CASCADE');
    await sql.unsafe('CREATE SCHEMA "public"');
    await migrate(drizzle(sql), { migrationsFolder: "./drizzle" });
  } finally {
    await sql.end();
  }
}
