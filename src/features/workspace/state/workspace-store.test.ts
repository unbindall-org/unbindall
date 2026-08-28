import { describe, expect, it } from "vitest";
import { createEmptyWorkspace } from "../domain/workspace";
import { createWorkspaceStore } from "./workspace-store";

function hydrated() {
  const store = createWorkspaceStore();
  store.getState().hydrate(createEmptyWorkspace());
  return store;
}

describe("workspace store tabs", () => {
  it("focuses an already open tab instead of duplicating it", () => {
    const store = hydrated();
    const first = store.getState().openTab({ kind: "community" });
    store.getState().openTab({ kind: "settings" });
    const again = store.getState().openTab({ kind: "community" });

    expect(again).toBe(first);
    expect(store.getState().tabs.filter((tab) => tab.kind === "community")).toHaveLength(1);
    expect(store.getState().activeTabId).toBe("community");
  });

  it("focuses the right neighbour when the active tab closes", () => {
    const store = hydrated();
    store.getState().openTab({ kind: "community" });
    store.getState().openTab({ kind: "settings" });
    store.getState().setActiveTab("community");

    store.getState().closeTab("community");
    expect(store.getState().activeTabId).toBe("settings");
  });

  it("keeps the active tab when a different one closes", () => {
    const store = hydrated();
    store.getState().openTab({ kind: "community" });
    store.getState().openTab({ kind: "settings" });

    store.getState().closeTab("community");
    expect(store.getState().activeTabId).toBe("settings");
    expect(store.getState().tabs.map((tab) => tab.id)).toEqual(["start", "settings"]);
  });

  it("prunes tabs for configs that no longer exist", () => {
    const store = hydrated();
    const project = store.getState().projects[0];
    const config = store.getState().addLocalConfig(project.id, "Autoexec", "matchmaking");
    store.getState().openTab({ kind: "config", configId: config.id });
    store.getState().openTab({ kind: "config", configId: "vanished" });

    store.getState().pruneConfigTabs(new Set([config.id]));
    expect(store.getState().tabs.map((tab) => tab.id)).toEqual(["start", `config:${config.id}`]);
  });
});

describe("workspace store projects", () => {
  it("moves configs to a sibling instead of deleting them with the project", () => {
    const store = hydrated();
    const first = store.getState().projects[0];
    const second = store.getState().addProject("Zweitsetup");
    const config = store.getState().addLocalConfig(second.id, "Practice", "practice");

    store.getState().removeProject(second.id);

    expect(store.getState().projects).toHaveLength(1);
    expect(store.getState().configs.find((item) => item.id === config.id)?.projectId).toBe(first.id);
  });

  it("refuses to delete the last project", () => {
    const store = hydrated();
    const only = store.getState().projects[0];
    store.getState().removeProject(only.id);
    expect(store.getState().projects).toEqual([only]);
  });
});

describe("workspace store configs", () => {
  it("closes the tab of a deleted config", () => {
    const store = hydrated();
    const project = store.getState().projects[0];
    const config = store.getState().addLocalConfig(project.id, "Autoexec", "matchmaking");
    store.getState().openTab({ kind: "config", configId: config.id });

    store.getState().removeLocalConfig(config.id);

    expect(store.getState().configs).toEqual([]);
    expect(store.getState().tabs.map((tab) => tab.id)).toEqual(["start"]);
    expect(store.getState().activeTabId).toBe("start");
  });

  it("ignores an update that changes nothing", () => {
    const store = hydrated();
    const project = store.getState().projects[0];
    const config = store.getState().addLocalConfig(project.id, "Autoexec", "matchmaking");
    const before = store.getState().configs;

    store.getState().updateLocalConfig(config.id, { name: config.name, document: config.document });
    expect(store.getState().configs).toBe(before);
  });

  it("records a new timestamp on a real edit", () => {
    const store = hydrated();
    const project = store.getState().projects[0];
    const config = store.getState().addLocalConfig(project.id, "Autoexec", "matchmaking");

    store.getState().updateLocalConfig(config.id, { name: "Umbenannt" });
    expect(store.getState().configs[0].name).toBe("Umbenannt");
  });
});
