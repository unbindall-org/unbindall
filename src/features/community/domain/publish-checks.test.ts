import { describe, expect, it } from "vitest";
import type { CommandDefinition } from "@/features/generator/catalog/commands";
import { createDefaultDocument } from "@/features/generator/domain/document";
import type { GeneratorDocument } from "@/features/generator/domain/types";
import { checkPublication, duplicateFinding, summarize } from "./publish-checks";

const catalog: CommandDefinition[] = [
  {
    name: "sv_cheats", label: "Cheats", description: "", category: "practice", type: "toggle", defaultValue: 0,
    status: { verification: "verified", restrictions: ["requires-cheats"], checkedVersion: "test" },
  },
  {
    name: "bot_kick", label: "Bots entfernen", description: "", category: "practice", type: "action", defaultValue: "",
    status: { verification: "verified", restrictions: ["offline-only"], checkedVersion: "test" },
  },
  {
    name: "cl_old", label: "Alt", description: "", category: "hud", type: "toggle", defaultValue: 0,
    status: { verification: "deprecated", restrictions: [], checkedVersion: "test" },
  },
];

function file(configType: GeneratorDocument["configType"], enabled: string[]) {
  const document = createDefaultDocument(configType);
  for (const name of enabled) {
    document.commandValues[name] = 1;
    document.commandValues[`enabled:${name}`] = true;
  }
  return { name: `${configType}.cfg`, configType, document };
}

const text = { title: "Mein Setup", summary: "Eine ganz normale Beschreibung." };

describe("checkPublication", () => {
  it("passes a clean config", () => {
    expect(checkPublication([file("matchmaking", [])], text, catalog).status).toBe("ok");
  });

  it("blocks a cheat command in a config type that cannot run it", () => {
    const result = checkPublication([file("matchmaking", ["sv_cheats"])], text, catalog);
    expect(result.status).toBe("blocked");
    expect(result.findings[0]).toMatchObject({ code: "cheat-command", severity: "block" });
  });

  it("allows the same command in a practice config", () => {
    expect(checkPublication([file("practice", ["sv_cheats"])], text, catalog).status).toBe("ok");
  });

  it("blocks an offline-only command in an online config type", () => {
    const result = checkPublication([file("server", ["bot_kick"])], text, catalog);
    expect(result.findings.map((finding) => finding.code)).toContain("offline-command");
  });

  it("flags a deprecated command without blocking", () => {
    const result = checkPublication([file("matchmaking", ["cl_old"])], text, catalog);
    expect(result.status).toBe("flagged");
  });

  it("blocks a custom bind that bypasses the bind rules", () => {
    const entry = file("matchmaking", []);
    entry.document.customBinds = [{ id: "x", label: "", key: "f", command: "exec cheat.cfg", enabled: true }];
    const result = checkPublication([entry], text, catalog);
    expect(result.findings.map((finding) => finding.code)).toContain("unsafe-bind");
    expect(result.status).toBe("blocked");
  });

  it("treats one link as a flag and three as a block", () => {
    const one = checkPublication([file("matchmaking", [])], { ...text, summary: "Siehe https://example.com" }, catalog);
    expect(one.status).toBe("flagged");

    const many = checkPublication([file("matchmaking", [])], {
      ...text,
      summary: "https://a.com https://b.com https://c.com",
    }, catalog);
    expect(many.status).toBe("blocked");
  });

  it("summarizes a duplicate as a flag", () => {
    expect(summarize([duplicateFinding("other-post-ab12cd")]).status).toBe("flagged");
  });
});
