import { createContext, createElement, useContext, useState, type ReactNode } from "react";
import { useStore } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { createStore, type Mutate, type StoreApi } from "zustand/vanilla";
import type { ConfigType, GeneratorDocument } from "@/features/generator/domain/types";
import {
  createLocalConfig,
  createProject,
  defaultProjectName,
  tabId,
  toTab,
  type LocalConfigRecord,
  type StoredWorkspace,
  type WorkspaceProject,
  type WorkspaceTab,
  type WorkspaceTabDescriptor,
} from "../domain/workspace";

export type WorkspaceState = {
  projects: WorkspaceProject[];
  configs: LocalConfigRecord[];
  tabs: WorkspaceTab[];
  activeTabId: string | null;
  hydrated: boolean;
};

export type WorkspaceActions = {
  hydrate(stored: StoredWorkspace): void;
  openTab(descriptor: WorkspaceTabDescriptor): string;
  closeTab(id: string): void;
  closeOtherTabs(id: string): void;
  setActiveTab(id: string): void;
  addProject(name: string): WorkspaceProject;
  renameProject(id: string, name: string): void;
  removeProject(id: string): void;
  setProjects(projects: WorkspaceProject[]): void;
  addLocalConfig(projectId: string, name: string, configType: ConfigType, document?: GeneratorDocument): LocalConfigRecord;
  updateLocalConfig(id: string, patch: { name?: string; document?: GeneratorDocument }): void;
  moveLocalConfig(id: string, projectId: string): void;
  removeLocalConfig(id: string): void;
  pruneConfigTabs(knownIds: Set<string>): void;
};

export type WorkspaceStore = WorkspaceState & WorkspaceActions;
export type WorkspaceStoreApi = Mutate<StoreApi<WorkspaceStore>, [["zustand/subscribeWithSelector", never]]>;

function withActiveTab(tabs: WorkspaceTab[], activeTabId: string | null) {
  if (activeTabId && tabs.some((tab) => tab.id === activeTabId)) return activeTabId;
  return tabs.at(-1)?.id ?? null;
}

export function createWorkspaceStore(initial?: Partial<WorkspaceState>) {
  return createStore<WorkspaceStore>()(subscribeWithSelector((set, get) => ({
    projects: [],
    configs: [],
    tabs: [],
    activeTabId: null,
    hydrated: false,
    ...initial,

    hydrate(stored) {
      const tabs = stored.tabs.map(toTab);
      set({
        projects: stored.projects,
        configs: stored.configs,
        tabs,
        activeTabId: withActiveTab(tabs, stored.activeTabId),
        hydrated: true,
      });
    },

    openTab(descriptor) {
      const id = tabId(descriptor);
      set((state) => state.tabs.some((tab) => tab.id === id)
        ? { activeTabId: id }
        : { tabs: [...state.tabs, toTab(descriptor)], activeTabId: id });
      return id;
    },

    closeTab(id) {
      set((state) => {
        const index = state.tabs.findIndex((tab) => tab.id === id);
        if (index === -1) return state;
        const tabs = state.tabs.filter((tab) => tab.id !== id);
        if (state.activeTabId !== id) return { tabs };
        // Closing the active tab focuses its right neighbour, then its left one.
        const next = tabs[index] ?? tabs[index - 1] ?? null;
        return { tabs, activeTabId: next?.id ?? null };
      });
    },

    closeOtherTabs(id) {
      set((state) => {
        const kept = state.tabs.filter((tab) => tab.id === id);
        return kept.length ? { tabs: kept, activeTabId: id } : state;
      });
    },

    setActiveTab(activeTabId) {
      set((state) => state.tabs.some((tab) => tab.id === activeTabId) ? { activeTabId } : state);
    },

    addProject(name) {
      const project = createProject(name, get().projects.length);
      set((state) => ({ projects: [...state.projects, project] }));
      return project;
    },

    renameProject(id, name) {
      set((state) => ({
        projects: state.projects.map((project) => project.id === id ? { ...project, name } : project),
      }));
    },

    removeProject(id) {
      set((state) => {
        if (state.projects.length <= 1) return state;
        const fallback = state.projects.find((project) => project.id !== id);
        if (!fallback) return state;
        return {
          projects: state.projects.filter((project) => project.id !== id),
          configs: state.configs.map((config) =>
            config.projectId === id ? { ...config, projectId: fallback.id } : config),
        };
      });
    },

    setProjects(projects) {
      set({ projects });
    },

    addLocalConfig(projectId, name, configType, document) {
      const record = createLocalConfig(projectId, name, configType, document);
      set((state) => ({ configs: [...state.configs, record] }));
      return record;
    },

    updateLocalConfig(id, patch) {
      set((state) => {
        const existing = state.configs.find((config) => config.id === id);
        if (!existing) return state;
        const name = patch.name ?? existing.name;
        const document = patch.document ?? existing.document;
        if (name === existing.name && document === existing.document) return state;
        return {
          configs: state.configs.map((config) => config.id === id
            ? { ...config, name, document, updatedAt: new Date().toISOString() }
            : config),
        };
      });
    },

    moveLocalConfig(id, projectId) {
      set((state) => ({
        configs: state.configs.map((config) => config.id === id ? { ...config, projectId } : config),
      }));
    },

    removeLocalConfig(id) {
      set((state) => {
        const tabs = state.tabs.filter((tab) => tab.kind !== "config" || tab.configId !== id);
        return {
          configs: state.configs.filter((config) => config.id !== id),
          tabs,
          activeTabId: withActiveTab(tabs, state.activeTabId),
        };
      });
    },

    /** Drops tabs for cloud configs that vanished (deleted on another device). */
    pruneConfigTabs(knownIds) {
      set((state) => {
        const tabs = state.tabs.filter((tab) => tab.kind !== "config" || knownIds.has(tab.configId));
        if (tabs.length === state.tabs.length) return state;
        return { tabs, activeTabId: withActiveTab(tabs, state.activeTabId) };
      });
    },
  })));
}

const WorkspaceStoreContext = createContext<WorkspaceStoreApi | null>(null);

export function WorkspaceStoreProvider({
  children,
  initialTab,
}: {
  children: ReactNode;
  initialTab?: WorkspaceTabDescriptor;
}) {
  const [store] = useState(() => {
    if (!initialTab) return createWorkspaceStore();
    const tab = toTab(initialTab);
    return createWorkspaceStore({ tabs: [tab], activeTabId: tab.id });
  });
  return createElement(WorkspaceStoreContext.Provider, { value: store }, children);
}

export function useWorkspaceStore<T>(selector: (state: WorkspaceStore) => T): T {
  const store = useContext(WorkspaceStoreContext);
  if (!store) throw new Error("useWorkspaceStore must be used inside WorkspaceStoreProvider");
  return useStore(store, selector);
}

export function useWorkspaceStoreApi() {
  const store = useContext(WorkspaceStoreContext);
  if (!store) throw new Error("useWorkspaceStoreApi must be used inside WorkspaceStoreProvider");
  return store;
}

export { defaultProjectName };
