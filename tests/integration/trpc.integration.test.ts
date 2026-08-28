import { TRPCError } from "@trpc/server";
import { describe, expect, it } from "vitest";
import { caller, testDocument } from "./helpers";
import { testSql } from "./database";

async function registeredUser(email = "owner@example.com") {
  await caller().auth.register({ name: "Owner", email, password: "correct horse" });
  const sql = testSql();
  try {
    const [user] = await sql<{ id: string }[]>`SELECT id FROM users WHERE email = ${email}`;
    if (!user) throw new Error("Testnutzer wurde nicht angelegt.");
    return user.id;
  } finally {
    await sql.end();
  }
}

describe("tRPC-Router mit PostgreSQL", () => {
  it("schützt private Prozeduren und isoliert Configs pro Account", async () => {
    await expect(caller().config.list()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    const ownerId = await registeredUser();
    const strangerId = await registeredUser("stranger@example.com");
    const created = await caller(ownerId).config.create({
      name: "Competitive", values: testDocument(), rawConfig: "fps_max 400", mutationId: crypto.randomUUID(),
    });

    expect(await caller(ownerId).config.list()).toHaveLength(1);
    await expect(caller(strangerId).config.get({ id: created.id })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("behandelt Mutation-IDs idempotent und rekonstruiert den Verlauf", async () => {
    const userId = await registeredUser();
    const mutationId = crypto.randomUUID();
    const document = testDocument();
    const first = await caller(userId).config.create({ name: "Main", values: document, rawConfig: "", mutationId });
    const duplicate = await caller(userId).config.create({ name: "Main", values: document, rawConfig: "", mutationId });
    expect(duplicate.id).toBe(first.id);

    const changed = structuredClone(document);
    changed.commandValues.sensitivity = 1.7;
    const saved = await caller(userId).config.save({
      id: first.id,
      expectedRevision: 1,
      mutationId: crypto.randomUUID(),
      name: "Main",
      values: changed,
      rawConfig: "sensitivity 1.7",
      checkpointLabel: "Vor dem Match",
    });
    expect(saved.revision).toBe(2);
    expect((await caller(userId).config.revision({ id: first.id, revision: 1 })).values).toEqual(document);
    expect((await caller(userId).config.history({ id: first.id, limit: 10 })).items).toMatchObject([
      { revision: 2, kind: "manual", label: "Vor dem Match" },
      { revision: 1, kind: "create" },
    ]);
  });

  it("serialisiert parallele Autosaves und weist die veraltete Revision zurück", async () => {
    const userId = await registeredUser();
    const document = testDocument();
    const created = await caller(userId).config.create({
      name: "Race", values: document, rawConfig: "", mutationId: crypto.randomUUID(),
    });
    const left = structuredClone(document);
    left.commandValues.sensitivity = 1.1;
    const right = structuredClone(document);
    right.commandValues.sensitivity = 2.2;

    const results = await Promise.allSettled([
      caller(userId).config.autosave({
        id: created.id, expectedRevision: 1, mutationId: crypto.randomUUID(), name: "Race", values: left, rawConfig: "sensitivity 1.1",
      }),
      caller(userId).config.autosave({
        id: created.id, expectedRevision: 1, mutationId: crypto.randomUUID(), name: "Race", values: right, rawConfig: "sensitivity 2.2",
      }),
    ]);

    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    const rejected = results.find((result): result is PromiseRejectedResult => result.status === "rejected");
    expect(rejected?.reason).toBeInstanceOf(TRPCError);
    expect(rejected?.reason).toMatchObject({ code: "CONFLICT" });
    const current = await caller(userId).config.get({ id: created.id });
    expect(current.revision).toBe(2);
    const values = current.values as ReturnType<typeof testDocument>;
    expect([1.1, 2.2]).toContain(values.commandValues.sensitivity);

    const sql = testSql();
    try {
      const [{ count }] = await sql<{ count: number }[]>`
        SELECT count(*)::int AS count FROM config_revisions WHERE config_id = ${created.id}
      `;
      expect(count).toBe(2);
    } finally {
      await sql.end();
    }
  });
});
