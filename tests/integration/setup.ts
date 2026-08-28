import { afterEach } from "vitest";
import { testSql } from "./database";

afterEach(async () => {
  const sql = testSql();
  try {
    await sql.unsafe(
      "TRUNCATE TABLE config_revisions, configs, sessions, accounts, verification_tokens, users CASCADE",
    );
  } finally {
    await sql.end();
  }
});
