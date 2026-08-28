import { describe, expect, it } from "vitest";
import { normalizeDocument } from "@/features/generator/domain/document";
import {
  buildTree,
  createEmptyWorkspace,
  createLocalConfig,
  createProject,
  normalizeWorkspace,
  tabId,
  tabUsesExplorer,
  type WorkspaceFile,
} from "./workspace";

describe("normalizeWorkspace", () => {
  it("always yields at least one project and one tab", () => {
    const workspace = normalizeWorkspace(null, normalizeDocument);
    expect(workspace.projects).toHaveLength(1);
    expect(workspace.tabs).toEqual([{ kind: "start" }]);
    expect(workspace.activeTabId).toBe("start");
  });

  it("drops config tabs whose config is gone", () => {
    const workspace = normalizeWorkspace({
      projects: [{ id: "p1", name: "Setup", position: 0 }],
      configs: [],
      tabs: [{ kind: "config", configId: "missing" }, { kind: "community" }],
      activeTabId: "config:missing",
    }, normalizeDocument);

    expect(workspace.tabs).toEqual([{ kind: "community" }]);
    expect(workspace.activeTabId).toBe("community");
  });

  it("reassigns configs whose project vanished", () => {
    const workspace = normalizeWorkspace({
      projects: [{ id: "p1", name: "Setup", position: 0 }],
      configs: [{ id: "c1", projectId: "gone", name: "Autoexec", configType: "practice", document: {}, updatedAt: "x" }],
      tabs: [],
      activeTabId: null,
    }, normalizeDocument);

    expect(workspace.configs[0].projectId).toBe("p1");
    expect(workspace.configs[0].configType).toBe("practice");
  });

  it("keeps the standalone page tabs and drops unknown kinds", () => {
    const workspace = normalizeWorkspace({
      projects: [{ id: "p1", name: "Setup", position: 0 }],
      configs: [],
      tabs: [{ kind: "trash" }, { kind: "commands" }, { kind: "wat" }],
      activeTabId: "commands",
    }, normalizeDocument);

    expect(workspace.tabs).toEqual([{ kind: "trash" }, { kind: "commands" }]);
    expect(workspace.activeTabId).toBe("commands");
  });

  it("falls back to matchmaking for an unknown config type", () => {
    const workspace = normalizeWorkspace({
      projects: [{ id: "p1", name: "Setup", position: 0 }],
      configs: [{ id: "c1", projectId: "p1", name: "X", configType: "nonsense", document: {}, updatedAt: "x" }],
      tabs: [],
      activeTabId: null,
    }, normalizeDocument);

    expect(workspace.configs[0].configType).toBe("matchmaking");
  });

  it("keeps an empty workspace usable", () => {
    const empty = createEmptyWorkspace();
    expect(empty.projects[0].name).toBe("Mein Setup");
    expect(empty.configs).toEqual([]);
  });
});

describe("tabUsesExplorer", () => {
  it("keeps the file panel for the configurator and the workspace root", () => {
    expect(tabUsesExplorer({ kind: "config", configId: "a" })).toBe(true);
    expect(tabUsesExplorer({ kind: "start" })).toBe(true);
    expect(tabUsesExplorer(null)).toBe(true);
  });

  it("drops it on standalone pages", () => {
    for (const kind of ["community", "community-post", "commands", "trash", "settings"] as const) {
      expect(tabUsesExplorer({ kind }), kind).toBe(false);
    }
  });
});

describe("tabId", () => {
  it("namespaces config tabs and keeps static tabs stable", () => {
    expect(tabId({ kind: "config", configId: "abc" })).toBe("config:abc");
    expect(tabId({ kind: "settings" })).toBe("settings");
  });
});

describe("buildTree", () => {
  const file = (id: string, projectId: string, name: string): WorkspaceFile => ({
    id, projectId, name, configType: "matchmaking", origin: "local", updatedAt: "2026-01-01",
  });

  it("groups files under their project, ordered by position", () => {
    const second = createProject("Zweitaccount", 1);
    const first = createProject("Haupt", 0);
    const tree = buildTree([second, first], [
      file("a", first.id, "autoexec"),
      file("b", second.id, "practice"),
    ]);

    expect(tree.map((project) => project.name)).toEqual(["Haupt", "Zweitaccount"]);
    expect(tree[0].files.map((item) => item.name)).toEqual(["autoexec"]);
  });

  it("parks files of an unknown project in the first project instead of hiding them", () => {
    const project = createProject("Haupt", 0);
    const tree = buildTree([project], [file("orphan", "deleted-project", "waise")]);
    expect(tree[0].files.map((item) => item.id)).toEqual(["orphan"]);
  });
});

describe("createLocalConfig", () => {
  it("seeds the document from the config type", () => {
    const record = createLocalConfig("p1", "Practice", "practice");
    expect(record.document.configType).toBe("practice");
    expect(record.projectId).toBe("p1");
  });
});
