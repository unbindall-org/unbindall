import { describe, expect, it } from "vitest";
import { caller } from "./helpers";
import { testSql } from "./database";

async function createUser(role: "user" | "platform_admin") {
  const id = crypto.randomUUID();
  const sql = testSql();
  try {
    await sql`INSERT INTO users (id, name, email, role) VALUES (${id}, 'Catalog User', ${`${id}@example.test`}, ${role})`;
  } finally {
    await sql.end();
  }
  return id;
}

const draftCommand = {
  name: "unbindall_test_command",
  category: "mouse" as const,
  type: "toggle" as const,
  label: { de: "Testschalter", en: "Test toggle" },
  description: { de: "Nur für den Integrationstest.", en: "Only used by the integration test." },
  defaultValue: false,
  enabledByDefault: false,
  options: [],
  verification: "verified" as const,
  restrictions: [],
  checkedVersion: "Integration test",
  configTypes: ["matchmaking" as const],
  sortOrder: 999_999,
  published: false,
};

describe("Command-Katalog", () => {
  it("migriert den vollständigen veröffentlichten Seed", async () => {
    const catalog = await caller().catalog.public();
    expect(catalog.commands).toHaveLength(144);
    expect(catalog.commands[0]).toMatchObject({ name: "sensitivity", published: true });
    expect(catalog.commands.every((command) => command.label.de && command.label.en)).toBe(true);
  });

  it("erlaubt Schreibzugriffe nur Plattform-Admins und schützt veröffentlichte Namen", async () => {
    const userId = await createUser("user");
    const adminId = await createUser("platform_admin");
    await expect(caller(userId).catalog.create(draftCommand)).rejects.toMatchObject({ code: "FORBIDDEN" });

    const createdSnapshot = await caller(adminId, "platform_admin").catalog.create(draftCommand);
    const created = createdSnapshot.commands.find((command) => command.name === draftCommand.name);
    expect(created).toMatchObject({ published: false, label: draftCommand.label });

    const publishedSnapshot = await caller(adminId, "platform_admin").catalog.update({
      id: created!.id,
      expectedRevision: created!.revision,
      command: { ...draftCommand, published: true },
    });
    const published = publishedSnapshot.commands.find((command) => command.id === created!.id)!;
    expect(published.published).toBe(true);
    await expect(caller(adminId, "platform_admin").catalog.update({
      id: created!.id,
      expectedRevision: created!.revision,
      command: { ...draftCommand, published: true, label: { de: "Veraltet", en: "Stale" } },
    })).rejects.toMatchObject({ code: "CONFLICT" });
    await expect(caller(adminId, "platform_admin").catalog.update({
      id: created!.id,
      expectedRevision: published.revision,
      command: { ...draftCommand, name: "unbindall_renamed_test_command", published: true },
    })).rejects.toMatchObject({ code: "BAD_REQUEST" });

    await caller(adminId, "platform_admin").catalog.update({
      id: created!.id,
      expectedRevision: published.revision,
      command: { ...draftCommand, published: false },
    });
    await expect(caller(adminId, "platform_admin").catalog.remove({ id: created!.id })).resolves.toEqual({ id: created!.id });
  });
});
