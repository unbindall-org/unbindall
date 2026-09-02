import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { testSql } from "../integration/database";

export default async function globalSetup() {
  const sql = testSql();
  try {
    await migrate(drizzle(sql), { migrationsFolder: "./drizzle" });
    await sql.unsafe(
      "TRUNCATE TABLE moderation_actions, content_reports, user_sanctions, community_adoptions, "
      + "community_reactions, community_follows, community_comments, community_post_versions, "
      + "community_posts, config_revisions, configs, sessions, accounts, verification_tokens, users CASCADE",
    );
  } finally {
    await sql.end();
  }
}
