import { describe, expect, it } from "vitest";
import { createDefaultDocument } from "../domain/document";
import { createGeneratorEditorStore, editorFingerprint } from "../state/editor-store";
import { draftStorageKeys, hydrateDraftStore, readDraft, startDraftPersistence, writeDraft } from "./draft-store";

function memoryStorage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    values,
  };
}

describe("draft persistence", () => {
  it("ignores invalid local JSON instead of blocking hydration", () => {
    const storage = memoryStorage({
      [draftStorageKeys.document]: "not-json",
      [draftStorageKeys.metadata]: JSON.stringify({ name: "Recovered" }),
    });
    expect(readDraft(storage, false)).toEqual({ name: "Recovered" });
  });

  it("does not restore cloud identity for a signed-out visitor", () => {
    const storage = memoryStorage({
      [draftStorageKeys.metadata]: JSON.stringify({
        name: "Draft",
        currentId: "86bbda74-38a5-4580-b0d5-f526ab473fd4",
        revision: 7,
        syncedFingerprint: "fingerprint",
      }),
    });
    expect(readDraft(storage, false)).toEqual({ name: "Draft" });
  });

  it("round-trips the discriminated cloud origin", () => {
    const document = createDefaultDocument();
    const store = createGeneratorEditorStore({ hydration: "ready" });
    store.getState().loadCloudConfig({
      id: "86bbda74-38a5-4580-b0d5-f526ab473fd4",
      name: "Cloud",
      values: document,
      revision: 2,
      updatedAt: "2026-08-28T12:00:00.000Z",
    });
    const storage = memoryStorage();
    expect(writeDraft(storage, store.getState())).toBe(true);

    const restored = readDraft(storage, true);
    expect(restored.cloud).toEqual({
      configId: "86bbda74-38a5-4580-b0d5-f526ab473fd4",
      revision: 2,
      lastSyncedFingerprint: editorFingerprint("Cloud", document),
    });
  });

  it("persists later editor changes through a store subscription", () => {
    const storage = memoryStorage();
    const store = createGeneratorEditorStore();
    hydrateDraftStore(store, storage, false);
    const stop = startDraftPersistence(store, storage);
    store.getState().setName("Changed");
    stop();

    expect(JSON.parse(storage.values.get(draftStorageKeys.metadata)!)).toMatchObject({ name: "Changed" });
  });
});
