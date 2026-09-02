import { afterEach } from "vitest";
import { testSql } from "./database";

afterEach(async () => {
  const sql = testSql();
  try {
    await sql.unsafe(
      "TRUNCATE TABLE moderation_actions, content_reports, user_sanctions, community_adoptions, "
      + "community_reactions, community_follows, community_comments, community_post_versions, "
      + "community_posts, config_revisions, configs, sessions, accounts, verification_tokens, users CASCADE",
    );
  } finally {
    await sql.end();
  }
});
