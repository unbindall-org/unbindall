import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config({ path: ".env.local" });
config();

const migrationUrl = process.env.DATABASE_MIGRATION_URL ?? process.env.DATABASE_URL;

if (!migrationUrl) {
  throw new Error("DATABASE_MIGRATION_URL oder DATABASE_URL muss gesetzt sein.");
}

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: migrationUrl,
  },
});
