import { describe, expect, it } from "vitest";
import { canonicalJson, type JsonValue } from "@/features/generator/domain/versioning";
import { accountConfigQuota, revisionRetention } from "@/trpc/routers/config";
import { caller, testDocument } from "./helpers";
import { testSql } from "./database";

async function registeredUser(email = "limits@example.com") {
  await caller().auth.register({ name: "Limits", email, password: "correct horse" });
  const sql = testSql();
  try {
    const [user] = await sql<{ id: string }[]>`SELECT id FROM users WHERE email = ${email}`;
    if (!user) throw new Error("Testnutzer wurde nicht angelegt.");
    return user.id;
  } finally {
    await sql.end();
  }
}

describe("persistente Account-Limits", () => {
  it("rollt die 26. Config transaktional zurück", async () => {
    const userId = await registeredUser();
    for (let index = 0; index < accountConfigQuota; index += 1) {
      await caller(userId).config.create({
        name: `Config ${index}`,
        values: testDocument(),
        rawConfig: "",
        mutationId: crypto.randomUUID(),
      });
    }

    await expect(caller(userId).config.create({
      name: "Eine zu viel",
      values: testDocument(),
      rawConfig: "",
      mutationId: crypto.randomUUID(),
    })).rejects.toMatchObject({ code: "FORBIDDEN" });

    expect(await caller(userId).config.list()).toHaveLength(accountConfigQuota);
  });

  it("rollt eine Config zurück, die das 10-MiB-Gesamtlimit überschreitet", async () => {
    const userId = await registeredUser("storage@example.com");
    const document = testDocument();
    document.importedFiles = Array.from({ length: 10 }, (_, index) => ({
      name: `large-${index}.cfg`,
      format: "cfg" as const,
      source: "x".repeat(100_000),
    }));

    let stored = 0;
    for (let index = 0; index < 10; index += 1) {
      try {
        await caller(userId).config.create({
          name: `Large ${index}`,
          values: document,
          rawConfig: "x".repeat(100_000),
          mutationId: crypto.randomUUID(),
        });
        stored += 1;
      } catch (error) {
        expect(error).toMatchObject({ code: "PAYLOAD_TOO_LARGE" });
        break;
      }
    }

    expect(stored).toBeGreaterThan(0);
    expect(stored).toBeLessThan(10);
    expect(await caller(userId).config.list()).toHaveLength(stored);
  });

  it("verdichtet mehr als 200 Revisionen auf eine rekonstruierbare Basis", async () => {
    const userId = await registeredUser("history@example.com");
    const document = testDocument();
    const created = await caller(userId).config.create({
      name: "History",
      values: document,
      rawConfig: "",
      mutationId: crypto.randomUUID(),
    });
    const sql = testSql();
    try {
      const [config] = await sql<{ contentHash: string }[]>`
        SELECT content_hash AS "contentHash" FROM configs WHERE id = ${created.id}
      `;
      await sql`
        INSERT INTO config_revisions (
          id, config_id, revision, parent_revision, kind, name, snapshot,
          patch, content_hash, mutation_id, created_at
        )
        SELECT
          ${created.id} || '-seed-' || revision,
          ${created.id}, revision, revision - 1, 'autosave', 'History',
          ${sql.json(document)}, NULL, ${config.contentHash},
          ${created.id} || '-mutation-' || revision,
          now() + revision * interval '1 millisecond'
        FROM generate_series(2, 200) AS revision
      `;
      await sql`UPDATE configs SET revision = 200 WHERE id = ${created.id}`;
    } finally {
      await sql.end();
    }

    const changed = structuredClone(document);
    changed.commandValues.sensitivity = 1.5;
    const saved = await caller(userId).config.autosave({
      id: created.id,
      expectedRevision: 200,
      mutationId: crypto.randomUUID(),
      name: "History",
      values: changed,
      rawConfig: "sensitivity 1.5",
    });
    expect(saved.revision).toBe(201);

    const verification = testSql();
    try {
      const [usage] = await verification<{ count: number; minimum: number }[]>`
        SELECT count(*)::int AS count, min(revision)::int AS minimum
        FROM config_revisions WHERE config_id = ${created.id}
      `;
      const [base] = await verification<{ snapshot: unknown; parentRevision: number | null }[]>`
        SELECT snapshot, parent_revision AS "parentRevision"
        FROM config_revisions
        WHERE config_id = ${created.id} AND revision = ${201 - revisionRetention + 1}
      `;
      expect(usage).toEqual({ count: revisionRetention, minimum: 102 });
      expect(base.parentRevision).toBeNull();
      expect(canonicalJson(base.snapshot as JsonValue)).toBe(canonicalJson(document as JsonValue));
    } finally {
      await verification.end();
    }
  });
});

