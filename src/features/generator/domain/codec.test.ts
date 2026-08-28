import { describe, expect, it } from "vitest";
import { findBindingConflicts, validateCustomCommand } from "./bindings";
import { parseConfig, parseConfigFiles, serializeConfig } from "./codec";
import { createDefaultDocument, normalizeDocument } from "./document";
import { GENERATOR_SCHEMA_VERSION } from "./types";

describe("generator document", () => {
  it("migrates legacy flat binds into the versioned document", () => {
    const document = normalizeDocument({
      sensitivity: 1.7,
      "enabled:sensitivity": true,
      "bind:jump": "mwheeldown",
      "enabled:bind:jump": true,
    });

    expect(document.schemaVersion).toBe(GENERATOR_SCHEMA_VERSION);
    expect(document.configType).toBe("matchmaking");
    expect(document.commandValues.sensitivity).toBe(1.7);
    expect(document.standardBinds.find((binding) => binding.actionId === "jump")).toMatchObject({
      key: "mwheeldown",
      enabled: true,
    });
  });

  it("serializes a double bind as two keys for one action", () => {
    const document = createDefaultDocument();
    document.standardBinds = document.standardBinds.map((binding) => binding.actionId === "smoke" ? { ...binding, enabled: false } : binding);
    document.multiBinds = [{
      id: "smoke-double",
      label: "Smoke Double",
      actionId: "smoke",
      keys: ["c", "mouse5"],
      enabled: true,
    }];

    const config = serializeConfig(document);
    expect(config).toContain('bind "c" "slot8"');
    expect(config).toContain('bind "mouse5" "slot8"');
    expect(config).not.toContain("slot8;");
  });

  it("localizes generated comments without changing commands", () => {
    const config = serializeConfig(createDefaultDocument(), "en");
    expect(config).toContain("// Mouse & Aim");
    expect(config).toContain("Generated on");
    expect(config).toContain("sensitivity 1.25");
  });

  it("serializes server text values and one-shot practice actions correctly", () => {
    const server = createDefaultDocument("server");
    server.commandValues.hostname = "Friday Night CS2";
    server.commandValues["enabled:hostname"] = true;

    const practice = createDefaultDocument("practice");
    practice.commandValues.bot_kick = true;
    practice.commandValues["enabled:bot_kick"] = true;

    expect(serializeConfig(server)).toContain('// Competitive Server\nhostname "Friday Night CS2"');
    expect(serializeConfig(practice)).toContain("// Practice\n");
    expect(serializeConfig(practice)).toContain("bot_kick");
    expect(serializeConfig(practice)).not.toContain("bot_kick 1");
  });

  it("keeps server and practice commands out of matchmaking configs", () => {
    const document = createDefaultDocument("matchmaking");
    document.commandValues.hostname = "Hidden Server";
    document.commandValues["enabled:hostname"] = true;
    document.commandValues.bot_kick = true;
    document.commandValues["enabled:bot_kick"] = true;

    const config = serializeConfig(document);
    expect(config).not.toContain("Hidden Server");
    expect(config).not.toContain("bot_kick");
  });

  it("serializes and imports Steam launch options", () => {
    const document = createDefaultDocument("launch-options");
    document.commandValues.launch_display_mode = "fullscreen";
    document.commandValues["enabled:launch_display_mode"] = true;
    document.commandValues.launch_width = 2560;
    document.commandValues["enabled:launch_width"] = true;

    expect(serializeConfig(document)).toBe("-console -fullscreen -w 2560");

    const imported = parseConfig("-windowed -w 1280 -h 720 -novid", createDefaultDocument("launch-options"));
    expect(imported.commandValues.launch_display_mode).toBe("windowed");
    expect(imported.commandValues.launch_width).toBe(1280);
    expect(imported.commandValues.launch_height).toBe(720);
    expect(imported.commandValues.launch_extra).toBe("-novid");
  });

  it("creates focused defaults for offline and warmup configs", () => {
    const offline = serializeConfig(createDefaultDocument("offline"));
    expect(offline).toContain("bot_difficulty 1");
    expect(offline).not.toContain("sensitivity");
    expect(offline).not.toContain('bind "w"');

    const warmup = serializeConfig(createDefaultDocument("warmup"));
    expect(warmup).toContain("mp_warmuptime 300");
    expect(warmup).not.toContain("mp_overtime_enable");
  });

  it("keeps deprecated commands visible to the catalog but out of generated configs", () => {
    const document = createDefaultDocument();
    document.commandValues.net_graph = true;
    document.commandValues["enabled:net_graph"] = true;

    expect(serializeConfig(document)).not.toContain("net_graph");
  });

  it("imports text values and argument-free actions", () => {
    const document = parseConfig('hostname "Scrim Server"\nbot_kick', createDefaultDocument());

    expect(document.commandValues.hostname).toBe("Scrim Server");
    expect(document.commandValues["enabled:hostname"]).toBe(true);
    expect(document.commandValues["enabled:bot_kick"]).toBe(true);
  });

  it("imports duplicate actions into the multi-bind module", () => {
    const document = parseConfig('bind "c" "slot8"\nbind "mouse5" "slot8"', createDefaultDocument());
    const imported = document.multiBinds.find((binding) => binding.label.includes("Import"));
    expect(imported).toMatchObject({ actionId: "smoke", keys: ["c", "mouse5"], enabled: true });
  });

  it("preserves comments, aliases, unknown commands, and quoted comment markers", () => {
    const source = [
      "// hand-tuned movement",
      'alias +jumpthrow "+jump;-attack"',
      'my_future_command "still here"',
      'hostname "https://example.test/scrim"',
    ].join("\n");
    const document = parseConfig(source, createDefaultDocument());
    const serialized = serializeConfig(document);

    expect(document.commandValues.hostname).toBe("https://example.test/scrim");
    expect(serialized).toContain(source);
  });

  it("imports multiple files in selection order without dropping their source", () => {
    const document = parseConfigFiles([
      { name: "movement.cfg", source: '// movement\nbind "c" "slot8"' },
      { name: "utility.cfg", source: '// utility\nbind "mouse5" "slot8"\nunknown_after 1' },
    ], createDefaultDocument());
    const serialized = serializeConfig(document);
    const imported = document.multiBinds.find((binding) => binding.label.includes("Import"));

    expect(document.importedFiles.map((file) => file.name)).toEqual(["movement.cfg", "utility.cfg"]);
    expect(imported).toMatchObject({ actionId: "smoke", keys: ["c", "mouse5"] });
    expect(serialized.indexOf("// movement")).toBeLessThan(serialized.indexOf("// utility"));
    expect(serialized).toContain("unknown_after 1");
  });

  it("converts CS2 KV1 VCFG convars and bindings while retaining the original", () => {
    const source = `"config"
{
  "convars"
  {
    "sensitivity" "2.15"
    "future_cvar" "enabled"
  }
  "bindings"
  {
    "MOUSE5" "slot8"
  }
}`;
    const document = parseConfigFiles([{ name: "cs2_user_convars_0_slot0.vcfg", source }], createDefaultDocument());
    const serialized = serializeConfig(document);

    expect(document.importedFiles[0].format).toBe("vcfg-kv1");
    expect(document.commandValues.sensitivity).toBe(2.15);
    expect(document.standardBinds.find((binding) => binding.actionId === "smoke")).toMatchObject({ key: "mouse5", enabled: true });
    expect(serialized).toContain('future_cvar "enabled"');
    expect(serialized).toContain('// "config"');
  });

  it("reads textual KV3 config containers", () => {
    const source = `<!-- kv3 encoding:text:version{test} format:generic:version{test} -->
{
  config = {
    convars = { volume = "0.42" }
    bindings = { c = "slot8" }
  }
}`;
    const document = parseConfigFiles([{ name: "user.kv3", source }], createDefaultDocument());

    expect(document.importedFiles[0].format).toBe("kv3");
    expect(document.commandValues.volume).toBe(0.42);
    expect(document.standardBinds.find((binding) => binding.actionId === "smoke")).toMatchObject({ key: "c", enabled: true });
  });

  it("detects when different actions compete for one key", () => {
    const document = createDefaultDocument();
    document.customBinds = [{ id: "custom", label: "Smoke", key: "mouse2", command: "slot8", enabled: true }];
    const conflicts = findBindingConflicts(document);
    expect(conflicts.get("mouse2")?.map((binding) => binding.command)).toEqual(expect.arrayContaining(["+attack2", "slot8"]));
  });
});

describe("custom bind safety", () => {
  it("accepts one command with arguments", () => {
    expect(validateCustomCommand("say_team Rush A")).toBeNull();
  });

  it("rejects command chains and config-mutating commands", () => {
    expect(validateCustomCommand("+jump; +attack")).toBe("Nur eine Aktion pro Bind erlaubt");
    expect(validateCustomCommand("unbindall")).toBe("Dieser Command ist für Custom-Binds gesperrt");
  });
});
