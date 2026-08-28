import { describe, expect, it } from "vitest";
import { applyJsonPatch, canonicalJson, createJsonPatch, shouldStoreSnapshot, type JsonValue } from "./versioning";

describe("config versioning", () => {
  it("round-trips nested object changes and arrays", () => {
    const previous = { schemaVersion: 2, values: { a: 1, obsolete: true }, binds: ["a"] } satisfies JsonValue;
    const next = { schemaVersion: 2, values: { a: 2, added: "yes" }, binds: ["a", "b"] } satisfies JsonValue;
    const patch = createJsonPatch(previous, next);

    expect(applyJsonPatch(previous, patch)).toEqual(next);
    expect(patch).toContainEqual({ op: "remove", path: ["values", "obsolete"] });
    expect(patch).toContainEqual({ op: "replace", path: ["binds"], value: ["a", "b"] });
  });

  it("canonicalizes object keys for stable content hashes", () => {
    expect(canonicalJson({ b: 2, a: { d: 4, c: 3 } })).toBe(canonicalJson({ a: { c: 3, d: 4 }, b: 2 }));
  });

  it("creates regular snapshots and promotes large patches", () => {
    expect(shouldStoreSnapshot(1, [], { a: 1 })).toBe(true);
    expect(shouldStoreSnapshot(50, [], { a: 1 })).toBe(true);
    expect(shouldStoreSnapshot(2, [{ op: "replace", path: [], value: { large: "replacement" } }], { a: 1 })).toBe(true);
    expect(shouldStoreSnapshot(2, [{ op: "replace", path: ["a"], value: 2 }], { a: 1, padding: "x".repeat(300) })).toBe(false);
  });
});
