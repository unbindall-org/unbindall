import { describe, expect, it } from "vitest";
import { CS2_CATALOG_VERSION, commands, presets } from "./commands";

describe("command catalog", () => {
  it("gives every command a current verification status", () => {
    for (const command of commands) {
      expect(["verified", "deprecated"]).toContain(command.status.verification);
      expect(command.status.checkedVersion).toBe(CS2_CATALOG_VERSION);
      expect(new Set(command.status.restrictions).size).toBe(command.status.restrictions.length);
    }
  });

  it("keeps command names unique across all config contexts", () => {
    expect(new Set(commands.map((command) => command.name)).size).toBe(commands.length);
  });

  it("covers competitive clients, match servers, and offline practice", () => {
    expect(commands.some((command) => command.category === "mouse" && command.status.verification === "verified")).toBe(true);
    expect(commands.some((command) => command.category === "server" && command.name === "mp_overtime_enable")).toBe(true);
    expect(commands.some((command) => command.category === "practice" && command.status.restrictions.includes("offline-only"))).toBe(true);
    expect(commands.some((command) => command.status.restrictions.includes("requires-cheats"))).toBe(true);
    expect(commands.some((command) => command.status.verification === "deprecated")).toBe(true);
  });

  it("stays inside the curated target range with balanced server and practice coverage", () => {
    expect(commands).toHaveLength(144);
    expect(commands.filter((command) => command.category === "server")).toHaveLength(40);
    expect(commands.filter((command) => command.category === "practice")).toHaveLength(28);
    expect(commands.filter((command) => command.category === "launch-options")).toHaveLength(7);
    expect(commands.filter((command) => command.status.verification === "deprecated")).toHaveLength(2);
  });

  it("keeps removed or development-only candidates out of the active catalog", () => {
    const names = new Set(commands.map((command) => command.name));
    expect(names.has("mp_damage_print_enable")).toBe(false);
    expect(names.has("mp_allowspectators")).toBe(false);
  });

  it("only references current catalog commands from presets", () => {
    const currentNames = new Set(commands
      .filter((command) => command.status.verification === "verified")
      .map((command) => command.name));

    for (const preset of presets) {
      for (const name of Object.keys(preset.values)) expect(currentNames.has(name)).toBe(true);
    }
  });

  it("never enables deprecated commands by default", () => {
    expect(commands.filter((command) => command.status.verification === "deprecated" && command.enabledByDefault)).toEqual([]);
  });
});
