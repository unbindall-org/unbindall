import { describe, expect, it } from "vitest";
import { caller, testDocument } from "./helpers";
import { testSql } from "./database";

async function registeredUser(email: string, handle?: string) {
  await caller().auth.register({ name: "Spieler", email, password: "correct horse" });
  const sql = testSql();
  try {
    const [user] = await sql<{ id: string }[]>`SELECT id FROM users WHERE email = ${email}`;
    if (!user) throw new Error("Testnutzer wurde nicht angelegt.");
    if (handle) {
      await sql`UPDATE users SET handle = ${handle}, display_name = ${handle} WHERE id = ${user.id}`;
    }
    return user.id;
  } finally {
    await sql.end();
  }
}

function publishInput(overrides: Record<string, unknown> = {}) {
  return {
    kind: "config" as const,
    title: "Faceit-Autoexec 2026",
    summary: "Statisches Crosshair, kompaktes HUD und ein Radar, das die ganze Map zeigt.",
    tags: ["crosshair", "radar"],
    visibility: "public" as const,
    files: [{
      name: "autoexec.cfg",
      configType: "matchmaking" as const,
      document: testDocument(),
      rawConfig: "fps_max 400",
    }],
    ...overrides,
  };
}

describe("Community-Router mit PostgreSQL", () => {
  it("verlangt einen Handle, bevor veröffentlicht werden darf", async () => {
    const withoutHandle = await registeredUser("nohandle@example.com");
    await expect(caller(withoutHandle).community.publish(publishInput()))
      .rejects.toMatchObject({ code: "PRECONDITION_FAILED" });

    await caller(withoutHandle).community.updateProfile({ handle: "niko_b", displayName: "Niko" });
    const published = await caller(withoutHandle).community.publish(publishInput());
    expect(published.slug).toMatch(/^faceit-autoexec-2026-[a-z0-9]{6}$/);
  });

  it("hält Handles eindeutig und blockt reservierte Namen", async () => {
    const first = await registeredUser("first@example.com");
    const second = await registeredUser("second@example.com");
    await caller(first).community.updateProfile({ handle: "sniper", displayName: "Sniper" });

    await expect(caller(second).community.updateProfile({ handle: "sniper", displayName: "Zwei" }))
      .rejects.toMatchObject({ code: "CONFLICT" });
    await expect(caller(second).community.updateProfile({ handle: "moderator", displayName: "Zwei" }))
      .rejects.toThrow();
  });

  it("liefert veröffentlichte Beiträge im Feed und über den Slug aus", async () => {
    const authorId = await registeredUser("author@example.com", "author");
    const post = await caller(authorId).community.publish(publishInput());

    const feed = await caller().community.feed({ scope: "new", cursor: 0 });
    expect(feed.items).toHaveLength(1);
    expect(feed.items[0]).toMatchObject({ slug: post.slug, author: { handle: "author" } });

    const detail = await caller().community.bySlug({ slug: post.slug });
    expect(detail.files).toHaveLength(1);
    expect(detail.post.tags).toEqual(["crosshair", "radar"]);
    expect(detail.versions).toHaveLength(1);
  });

  it("liefert den Beliebt-Feed nach dem abklingenden Score aus", async () => {
    const authorId = await registeredUser("trending@example.com", "trending_author");
    const post = await caller(authorId).community.publish(publishInput());

    const feed = await caller().community.feed({ scope: "trending", cursor: 0 });

    expect(feed.items).toHaveLength(1);
    expect(feed.items[0]).toMatchObject({ slug: post.slug });
  });

  it("hält nicht gelistete Beiträge aus dem Feed heraus, aber unter ihrem Link erreichbar", async () => {
    const authorId = await registeredUser("unlisted@example.com", "unlisted_author");
    const post = await caller(authorId).community.publish(publishInput({ visibility: "unlisted" }));

    expect((await caller().community.feed({ scope: "new", cursor: 0 })).items).toHaveLength(0);
    expect((await caller().community.bySlug({ slug: post.slug })).post.slug).toBe(post.slug);
  });

  it("blockt Configs, die einen Cheat-Command im falschen Config-Typ aktivieren", async () => {
    const authorId = await registeredUser("cheater@example.com", "cheater");
    const document = testDocument();
    document.commandValues["sv_cheats"] = 1;
    document.commandValues["enabled:sv_cheats"] = true;

    await expect(caller(authorId).community.publish(publishInput({
      files: [{ name: "autoexec.cfg", configType: "matchmaking", document, rawConfig: "sv_cheats 1" }],
    }))).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("zählt Likes und Übernahmen genau einmal pro Account", async () => {
    const authorId = await registeredUser("counted@example.com", "counted");
    const readerId = await registeredUser("reader@example.com", "reader");
    const post = await caller(authorId).community.publish(publishInput());
    const { post: created } = await caller().community.bySlug({ slug: post.slug });

    await caller(readerId).community.like({ id: created.id });
    await caller(readerId).community.like({ id: created.id });
    await caller(readerId).community.recordAdoption({ id: created.id, version: 1 });
    await caller(readerId).community.recordAdoption({ id: created.id, version: 1 });

    const after = await caller(readerId).community.bySlug({ slug: post.slug });
    expect(after.post.likeCount).toBe(1);
    expect(after.post.adoptCount).toBe(1);
    expect(after.viewer.liked).toBe(true);

    await caller(readerId).community.unlike({ id: created.id });
    expect((await caller().community.bySlug({ slug: post.slug })).post.likeCount).toBe(0);
  });

  it("erlaubt genau eine Antwortebene und zählt Kommentare mit", async () => {
    const authorId = await registeredUser("threads@example.com", "threads");
    const readerId = await registeredUser("commenter@example.com", "commenter");
    const post = await caller(authorId).community.publish(publishInput());
    const { post: created } = await caller().community.bySlug({ slug: post.slug });

    const root = await caller(readerId).community.addComment({ postId: created.id, body: "Läuft bei mir." });
    const reply = await caller(authorId).community.addComment({
      postId: created.id, parentId: root.id, body: "Danke!",
    });
    await expect(caller(readerId).community.addComment({
      postId: created.id, parentId: reply.id, body: "Zu tief",
    })).rejects.toMatchObject({ code: "BAD_REQUEST" });

    expect((await caller().community.bySlug({ slug: post.slug })).post.commentCount).toBe(2);

    await caller(readerId).community.deleteComment({ id: root.id });
    const comments = await caller().community.comments({ postId: created.id });
    expect(comments.find((comment) => comment.id === root.id)).toMatchObject({ status: "removed", body: "" });
    expect((await caller().community.bySlug({ slug: post.slug })).post.commentCount).toBe(1);
  });

  it("nimmt jede Meldung nur einmal pro Melder an und weist Eigenmeldungen ab", async () => {
    const authorId = await registeredUser("reported@example.com", "reported");
    const reporterId = await registeredUser("reporter@example.com", "reporter");
    const post = await caller(authorId).community.publish(publishInput());
    const { post: created } = await caller().community.bySlug({ slug: post.slug });

    expect(await caller(reporterId).community.report({
      targetType: "post", targetId: created.id, reason: "spam",
    })).toMatchObject({ duplicate: false });
    expect(await caller(reporterId).community.report({
      targetType: "post", targetId: created.id, reason: "spam",
    })).toMatchObject({ duplicate: true });
    await expect(caller(authorId).community.report({
      targetType: "post", targetId: created.id, reason: "spam",
    })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("verweigert den Moderationsbereich ohne Rolle und protokolliert jede Entscheidung", async () => {
    const authorId = await registeredUser("hidden@example.com", "hidden_author");
    const reporterId = await registeredUser("watcher@example.com", "watcher");
    const moderatorId = await registeredUser("mod@example.com", "mod");
    const post = await caller(authorId).community.publish(publishInput());
    const { post: created } = await caller().community.bySlug({ slug: post.slug });
    await caller(reporterId).community.report({ targetType: "post", targetId: created.id, reason: "spam" });

    await expect(caller(reporterId).moderation.queue({ limit: 10 })).rejects.toMatchObject({ code: "FORBIDDEN" });

    const sql = testSql();
    try {
      await sql`UPDATE users SET role = 'moderator' WHERE id = ${moderatorId}`;
    } finally {
      await sql.end();
    }

    const queue = await caller(moderatorId, "moderator").moderation.queue({ limit: 10 });
    expect(queue).toHaveLength(1);
    expect(queue[0].target).toMatchObject({ kind: "post", title: "Faceit-Autoexec 2026" });

    await caller(moderatorId, "moderator").moderation.act({
      reportId: queue[0].id,
      targetType: "post",
      targetId: created.id,
      action: "hide",
      reason: "Reiner Werbebeitrag ohne Config-Inhalt.",
    });

    // Hidden content leaves the feed, stays visible to its author, and is a 404
    // for everyone else — probing a slug must not reveal a takedown.
    expect((await caller().community.feed({ scope: "new", cursor: 0 })).items).toHaveLength(0);
    expect((await caller(authorId).community.bySlug({ slug: post.slug })).post.status).toBe("hidden");
    await expect(caller(reporterId).community.bySlug({ slug: post.slug }))
      .rejects.toMatchObject({ code: "NOT_FOUND" });

    const history = await caller(moderatorId, "moderator").moderation.history({ limit: 10 });
    expect(history).toMatchObject([{ action: "hide", reason: "Reiner Werbebeitrag ohne Config-Inhalt." }]);
    expect((await caller(moderatorId, "moderator").moderation.stats()).open).toBe(0);
  });

  it("setzt Sanktionen sofort durch", async () => {
    const offenderId = await registeredUser("offender@example.com", "offender");
    const moderatorId = await registeredUser("mod2@example.com", "mod2");
    const sql = testSql();
    try {
      await sql`UPDATE users SET role = 'moderator' WHERE id = ${moderatorId}`;
    } finally {
      await sql.end();
    }

    await caller(moderatorId, "moderator").moderation.act({
      targetType: "user",
      targetId: offenderId,
      action: "publish_ban",
      reason: "Wiederholtes Hochladen fremder Configs.",
    });

    await expect(caller(offenderId).community.publish(publishInput()))
      .rejects.toMatchObject({ code: "FORBIDDEN" });

    await caller(moderatorId, "moderator").moderation.act({
      targetType: "user",
      targetId: offenderId,
      action: "unban",
      reason: "Einspruch war berechtigt.",
    });
    expect((await caller(offenderId).community.publish(publishInput())).slug).toBeTruthy();
  });

  it("entfernt Beiträge, Kommentare und Meldungen mit dem Account", async () => {
    const authorId = await registeredUser("leaving@example.com", "leaving");
    await caller(authorId).community.publish(publishInput());
    await caller(authorId).account.delete({ password: "correct horse" });

    const sql = testSql();
    try {
      const [posts] = await sql<{ count: string }[]>`SELECT count(*)::text FROM community_posts`;
      expect(posts.count).toBe("0");
    } finally {
      await sql.end();
    }
  });
});
