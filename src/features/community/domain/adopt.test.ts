import { describe, expect, it } from "vitest";
import { commands } from "@/features/generator/catalog/commands";
import { createDefaultDocument } from "@/features/generator/domain/document";
import type { GeneratorDocument } from "@/features/generator/domain/types";
import { emptySelection, fullSelection, mergeDocument, selectionIsEmpty } from "./adopt";

function documentWith(patch: Partial<GeneratorDocument>): GeneratorDocument {
  return { ...createDefaultDocument("matchmaking"), ...patch };
}

function enable(document: GeneratorDocument, name: string, value: string | number | boolean) {
  document.commandValues[name] = value;
  document.commandValues[`enabled:${name}`] = true;
  return document;
}

describe("mergeDocument", () => {
  it("adopts only the selected categories", () => {
    const source = enable(createDefaultDocument("matchmaking"), "sensitivity", 2.4);
    enable(source, "cl_radar_scale", 0.77);
    const target = createDefaultDocument("matchmaking");

    const result = mergeDocument(target, source, { ...emptySelection, commandCategories: ["mouse"] }, commands);

    expect(result.document.commandValues.sensitivity).toBe(2.4);
    // Radar sits outside the selected category, so its value must stay the local one.
    expect(result.document.commandValues.cl_radar_scale).not.toBe(0.77);
  });

  it("reports a conflict instead of silently overwriting an enabled value", () => {
    const source = enable(createDefaultDocument("matchmaking"), "sensitivity", 2.4);
    const target = enable(createDefaultDocument("matchmaking"), "sensitivity", 1.1);

    const detected = mergeDocument(target, source, { ...emptySelection, commandCategories: ["mouse"] }, commands);
    expect(detected.conflicts).toMatchObject([{ id: "command:sensitivity", current: "1.1", incoming: "2.4" }]);
    expect(detected.document.commandValues.sensitivity).toBe(2.4);

    const kept = mergeDocument(
      target,
      source,
      { ...emptySelection, commandCategories: ["mouse"] },
      commands,
      { "command:sensitivity": "current" },
    );
    expect(kept.document.commandValues.sensitivity).toBe(1.1);
  });

  it("never adopts a command the target config type cannot run", () => {
    const source = enable(createDefaultDocument("practice"), "sv_cheats", 1);
    const target = createDefaultDocument("matchmaking");

    const result = mergeDocument(target, source, fullSelection(commands), commands);
    expect(result.document.commandValues["enabled:sv_cheats"]).not.toBe(true);
  });

  it("rejects custom binds that violate the bind rules", () => {
    const source = documentWith({
      customBinds: [
        { id: "a", label: "Böse", key: "f", command: "exec evil.cfg", enabled: true },
        { id: "b", label: "Gut", key: "g", command: "say gg", enabled: true },
      ],
    });
    const target = createDefaultDocument("matchmaking");

    const result = mergeDocument(target, source, { ...emptySelection, customBinds: true }, commands);
    expect(result.document.customBinds.map((bind) => bind.id)).toEqual(["b"]);
  });

  it("flags a key that is already taken by a different command", () => {
    const source = documentWith({
      customBinds: [{ id: "incoming", label: "Neu", key: "f", command: "say hi", enabled: true }],
    });
    const target = documentWith({
      customBinds: [{ id: "existing", label: "Alt", key: "f", command: "say bye", enabled: true }],
    });

    const result = mergeDocument(target, source, { ...emptySelection, customBinds: true }, commands);
    expect(result.conflicts).toMatchObject([{ id: "custom:incoming", kind: "bind-key" }]);
  });

  it("leaves the target untouched for an empty selection", () => {
    const source = enable(createDefaultDocument("matchmaking"), "sensitivity", 2.4);
    const target = createDefaultDocument("matchmaking");

    const result = mergeDocument(target, source, emptySelection, commands);
    expect(selectionIsEmpty(emptySelection)).toBe(true);
    expect(result.document.commandValues).toEqual(target.commandValues);
    expect(result.applied).toEqual({ commands: 0, standardBinds: 0, multiBinds: 0, customBinds: 0, importedFiles: 0 });
  });

  it("does not mutate the documents it merges", () => {
    const source = enable(createDefaultDocument("matchmaking"), "sensitivity", 2.4);
    const target = createDefaultDocument("matchmaking");
    const before = structuredClone(target);

    mergeDocument(target, source, fullSelection(commands), commands);
    expect(target).toEqual(before);
  });
});
