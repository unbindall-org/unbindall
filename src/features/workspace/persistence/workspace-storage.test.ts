import { describe, expect, it } from "vitest";
import { createDefaultDocument } from "@/features/generator/domain/document";
import { draftStorageKeys } from "@/features/generator/persistence/draft-store";
import { createEmptyWorkspace } from "../domain/workspace";
import { createWorkspaceStore } from "../state/workspace-store";
import { readWorkspace, workspaceStorageKey, writeWorkspace } from "./workspace-storage";

function storage(entries: Record<string, string> = {}) {
  const map = new Map(Object.entries(entries));
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => { map.set(key, value); },
    map,
  };
}

describe("readWorkspace", () => {
  it("adopts a pre-project draft as the first file so no work is lost", () => {
    const document = createDefaultDocument("practice");
    const store = storage({
      [draftStorageKeys.document]: JSON.stringify(document),
      [draftStorageKeys.metadata]: JSON.stringify({ name: "Mein Practice" }),
    });

    const workspace = readWorkspace(store);

    expect(workspace.configs).toHaveLength(1);
    expect(workspace.configs[0].name).toBe("Mein Practice");
    expect(workspace.configs[0].configType).toBe("practice");
    expect(workspace.activeTabId).toBe(`config:${workspace.configs[0].id}`);
  });

  it("starts empty when there is neither a workspace nor a draft", () => {
    const workspace = readWorkspace(storage());
    expect(workspace.configs).toEqual([]);
    expect(workspace.projects).toHaveLength(1);
  });

  it("survives a corrupted entry rather than locking the editor", () => {
    const workspace = readWorkspace(storage({ [workspaceStorageKey]: "{not json" }));
    expect(workspace.projects).toHaveLength(1);
  });

  it("ignores a draft that cannot be parsed", () => {
    const workspace = readWorkspace(storage({ [draftStorageKeys.document]: "{broken" }));
    expect(workspace.configs).toEqual([]);
  });
});

describe("writeWorkspace", () => {
  it("round-trips through storage without the derived tab ids", () => {
    const store = createWorkspaceStore();
    store.getState().hydrate(createEmptyWorkspace());
    const project = store.getState().projects[0];
    const config = store.getState().addLocalConfig(project.id, "Autoexec", "matchmaking");
    store.getState().openTab({ kind: "config", configId: config.id });

    const target = storage();
    expect(writeWorkspace(target, store.getState())).toBe(true);

    const written = JSON.parse(target.map.get(workspaceStorageKey) as string);
    expect(written.tabs).toEqual([{ kind: "start" }, { kind: "config", configId: config.id }]);

    const reread = readWorkspace(target);
    expect(reread.configs.map((item) => item.name)).toEqual(["Autoexec"]);
    expect(reread.activeTabId).toBe(`config:${config.id}`);
  });

  it("reports failure instead of throwing when storage is full", () => {
    const failing = {
      getItem: () => null,
      setItem: () => { throw new Error("QuotaExceededError"); },
    };
    const store = createWorkspaceStore();
    store.getState().hydrate(createEmptyWorkspace());
    expect(writeWorkspace(failing, store.getState())).toBe(false);
  });
});
