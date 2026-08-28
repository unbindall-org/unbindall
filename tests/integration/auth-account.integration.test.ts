import { compare } from "bcryptjs";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { describe, expect, it } from "vitest";
import { db } from "@/db";
import { accounts, sessions, users, verificationTokens } from "@/db/schema";
import { provisionSteamAccount, findSteamUser } from "@/features/auth/server/steam-account";
import { caller, testDocument } from "./helpers";
import { testSql } from "./database";

describe("Registrierung und Provider-Verknüpfung", () => {
  it("normalisiert die E-Mail, hasht das Passwort und verhindert Duplikate", async () => {
    await caller().auth.register({ name: "  Alice  ", email: "ALICE@EXAMPLE.COM", password: "secret-123" });
    const sql = testSql();
    try {
      const [user] = await sql<{ name: string; email: string; password_hash: string }[]>`
        SELECT name, email, password_hash FROM users
      `;
      expect(user).toMatchObject({ name: "Alice", email: "alice@example.com" });
      expect(user.password_hash).not.toBe("secret-123");
      expect(await compare("secret-123", user.password_hash)).toBe(true);
    } finally {
      await sql.end();
    }
    await expect(caller().auth.register({
      name: "Other", email: "alice@example.com", password: "secret-123",
    })).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("verknüpft Discord über den produktiven Auth.js-Adapter und provisioniert Steam idempotent", async () => {
    await caller().auth.register({ name: "Alice", email: "alice@example.com", password: "secret-123" });
    const sql = testSql();
    let userId: string;
    try {
      const [user] = await sql<{ id: string }[]>`SELECT id FROM users WHERE email = 'alice@example.com'`;
      userId = user.id;
    } finally {
      await sql.end();
    }
    const adapter = DrizzleAdapter(db, {
      usersTable: users,
      accountsTable: accounts,
      sessionsTable: sessions,
      verificationTokensTable: verificationTokens,
    });
    await adapter.linkAccount!({
      userId,
      type: "oauth",
      provider: "discord",
      providerAccountId: "discord-42",
    });
    await expect(adapter.getUserByAccount!({
      provider: "discord",
      providerAccountId: "discord-42",
    })).resolves.toMatchObject({ id: userId, email: "alice@example.com" });
    await expect(caller(userId).account.details()).resolves.toMatchObject({
      hasPassword: true,
      providers: ["discord"],
    });

    const first = await provisionSteamAccount({
      steamid: "76561198000000000", personaname: "Player One", avatarfull: "https://example.com/a.jpg",
    });
    const second = await provisionSteamAccount({
      steamid: "76561198000000000", personaname: "Renamed Player",
    });
    expect(second.id).toBe(first.id);
    await expect(findSteamUser("76561198000000000")).resolves.toMatchObject({
      id: first.id,
      name: "Renamed Player",
    });
  });
});

describe("Account-Löschung", () => {
  it("prüft das Passwort und löscht Provider, Sessions, Configs und Revisionen kaskadierend", async () => {
    await caller().auth.register({ name: "Delete Me", email: "delete@example.com", password: "secret-123" });
    const sql = testSql();
    let userId: string;
    try {
      const [user] = await sql<{ id: string }[]>`SELECT id FROM users WHERE email = 'delete@example.com'`;
      userId = user.id;
      await sql`INSERT INTO accounts (user_id, type, provider, provider_account_id) VALUES (${userId}, 'oauth', 'discord', 'delete-discord')`;
      await sql`INSERT INTO sessions (session_token, user_id, expires) VALUES ('delete-session', ${userId}, now() + interval '1 hour')`;
    } finally {
      await sql.end();
    }
    await caller(userId).config.create({
      name: "Delete Config", values: testDocument(), rawConfig: "", mutationId: crypto.randomUUID(),
    });

    await expect(caller(userId).account.delete({ password: "wrong-password" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller(userId).account.delete({ password: "secret-123" })).resolves.toEqual({ ok: true });

    const check = testSql();
    try {
      const [counts] = await check<{ users: number; accounts: number; sessions: number; configs: number; revisions: number }[]>`
        SELECT
          (SELECT count(*)::int FROM users) AS users,
          (SELECT count(*)::int FROM accounts) AS accounts,
          (SELECT count(*)::int FROM sessions) AS sessions,
          (SELECT count(*)::int FROM configs) AS configs,
          (SELECT count(*)::int FROM config_revisions) AS revisions
      `;
      expect(counts).toEqual({ users: 0, accounts: 0, sessions: 0, configs: 0, revisions: 0 });
    } finally {
      await check.end();
    }
  });
});
