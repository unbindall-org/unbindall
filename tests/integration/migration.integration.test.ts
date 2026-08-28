import { describe, expect, it } from "vitest";
import { testSql } from "./database";

describe("Migrationen aus leerer PostgreSQL-Datenbank", () => {
  it("erstellt alle Tabellen, Fremdschlüssel und partiellen Indizes", async () => {
    const sql = testSql();
    try {
      const tables = await sql<{ table_name: string }[]>`
        SELECT table_name FROM information_schema.tables
        WHERE table_schema = 'public'
      `;
      expect(tables.map((row) => row.table_name)).toEqual(expect.arrayContaining([
        "users", "accounts", "sessions", "verification_tokens", "configs", "config_revisions",
      ]));

      const indexes = await sql<{ indexname: string; indexdef: string }[]>`
        SELECT indexname, indexdef FROM pg_indexes WHERE schemaname = 'public'
      `;
      expect(indexes.find((index) => index.indexname === "configs_user_name_idx")?.indexdef)
        .toContain("WHERE (deleted_at IS NULL)");
      expect(indexes.map((index) => index.indexname)).toContain("config_revisions_mutation_idx");

      const [foreignKey] = await sql<{ delete_rule: string }[]>`
        SELECT delete_rule FROM information_schema.referential_constraints
        WHERE constraint_name = 'config_revisions_config_id_configs_id_fk'
      `;
      expect(foreignKey?.delete_rule).toBe("CASCADE");
    } finally {
      await sql.end();
    }
  });
});
