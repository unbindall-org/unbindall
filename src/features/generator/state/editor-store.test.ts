import { describe, expect, it } from "vitest";
import { createDefaultDocument } from "../domain/document";
import { createGeneratorEditorStore, editorFingerprint } from "./editor-store";

const cloudConfig = () => ({
  id: "86bbda74-38a5-4580-b0d5-f526ab473fd4",
  name: "Cloud Config",
  values: createDefaultDocument("matchmaking"),
  revision: 4,
  updatedAt: "2026-08-28T12:00:00.000Z",
});

describe("generator editor store", () => {
  it("rejects edits to non-verified catalog commands", () => {
    const store = createGeneratorEditorStore();

    store.getState().updateCommand("cl_bob_lower_amt", 5);
    store.getState().updateCommand("enabled:cl_bob_lower_amt", true);

    expect(store.getState().document.commandValues.cl_bob_lower_amt).toBe(21);
    expect(store.getState().document.commandValues["enabled:cl_bob_lower_amt"]).toBe(false);
  });

  it("keeps anonymous edits local", () => {
    const store = createGeneratorEditorStore({ hydration: "ready", sync: { status: "local" } });
    store.getState().updateCommand("sensitivity", 1.4);

    expect(store.getState().document.commandValues.sensitivity).toBe(1.4);
    expect(store.getState().origin).toEqual({ type: "anonymous" });
    expect(store.getState().sync).toEqual({ status: "local" });
  });

  it("only enables cloud sync after the remembered config was validated", () => {
    const document = createDefaultDocument();
    const fingerprint = editorFingerprint("Remembered", document);
    const store = createGeneratorEditorStore();
    store.getState().hydrateDraft({
      document,
      name: "Remembered",
      cloud: { configId: cloudConfig().id, revision: 3, lastSyncedFingerprint: fingerprint },
    });

    expect(store.getState().origin).toMatchObject({ type: "cloud", validated: false });
    expect(store.getState().sync.status).toBe("hydrating");

    store.getState().validateCloudOrigin(3);
    expect(store.getState().origin).toMatchObject({ type: "cloud", validated: true, revision: 3 });
    expect(store.getState().sync.status).toBe("saved");
  });

  it("models dirty, syncing and saved as explicit transitions", () => {
    const store = createGeneratorEditorStore({ hydration: "ready" });
    const loaded = cloudConfig();
    store.getState().loadCloudConfig(loaded);
    store.getState().updateCommand("sensitivity", 1.8);
    expect(store.getState().sync.status).toBe("dirty");

    const fingerprint = editorFingerprint(store.getState().name, store.getState().document);
    store.getState().autosaveStarted("mutation-1", fingerprint);
    expect(store.getState().sync).toEqual({ status: "syncing", mutationId: "mutation-1", fingerprint });

    store.getState().autosaveSucceeded({ ...loaded, values: store.getState().document, revision: 5 }, fingerprint);
    expect(store.getState().sync.status).toBe("saved");
    expect(store.getState().origin).toMatchObject({ type: "cloud", revision: 5, lastSyncedFingerprint: fingerprint });
  });

  it("stays dirty when the document changes during an in-flight autosave", () => {
    const store = createGeneratorEditorStore({ hydration: "ready" });
    const loaded = cloudConfig();
    store.getState().loadCloudConfig(loaded);
    store.getState().updateCommand("sensitivity", 1.1);
    const sentFingerprint = editorFingerprint(store.getState().name, store.getState().document);
    store.getState().autosaveStarted("mutation-2", sentFingerprint);
    store.getState().updateCommand("sensitivity", 2.2);

    store.getState().autosaveSucceeded({ ...loaded, revision: 5 }, sentFingerprint);
    expect(store.getState().sync.status).toBe("dirty");
    expect(store.getState().document.commandValues.sensitivity).toBe(2.2);
  });

  it("does not erase an unresolved conflict on further edits", () => {
    const store = createGeneratorEditorStore({ hydration: "ready" });
    store.getState().loadCloudConfig(cloudConfig());
    store.getState().autosaveFailed("mutation-3", "CONFLICT", 8);
    store.getState().updateCommand("sensitivity", 2.5);

    expect(store.getState().sync).toEqual({
      status: "conflict",
      localMutationId: "mutation-3",
      serverRevision: 8,
    });
  });

  it("makes reset and import impossible to retain a stale cloud origin", () => {
    const store = createGeneratorEditorStore({ hydration: "ready" });
    store.getState().loadCloudConfig(cloudConfig());
    store.getState().createAnonymousDocument("practice", "Practice");
    expect(store.getState().origin).toEqual({ type: "anonymous" });
    expect(store.getState().document.configType).toBe("practice");

    store.getState().loadCloudConfig(cloudConfig());
    store.getState().importDocument(createDefaultDocument("server"), "Imported");
    expect(store.getState().origin).toEqual({ type: "anonymous" });
    expect(store.getState().name).toBe("Imported");
  });
});
