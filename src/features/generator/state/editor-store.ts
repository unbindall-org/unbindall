import { createContext, createElement, useContext, useState, type ReactNode } from "react";
import { useStore } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { createStore, type Mutate, type StoreApi } from "zustand/vanilla";
import { commands, isCommandEditable } from "../catalog/commands";
import { createDefaultDocument, normalizeDocument } from "../domain/document";
import type { ConfigType, GeneratorDocument } from "../domain/types";
import type { GeneratorModuleId } from "../modules/registry";

export type CloudOrigin = {
  type: "cloud";
  configId: string;
  revision: number;
  lastSyncedFingerprint: string;
  validated: boolean;
};

export type EditorOrigin = { type: "anonymous" } | CloudOrigin;

export type SyncState =
  | { status: "local" }
  | { status: "hydrating" }
  | { status: "saved"; savedAt: string | null }
  | { status: "dirty"; dirtySince: number }
  | { status: "syncing"; mutationId: string; fingerprint: string }
  | { status: "offline"; queuedAt: string }
  | { status: "conflict"; localMutationId: string; serverRevision?: number };

export type LoadedCloudConfig = {
  id: string;
  name: string;
  values: unknown;
  revision: number;
  updatedAt: string;
};

export type SavedCloudConfig = LoadedCloudConfig & {
  createdAt?: string;
  deletedAt?: string | null;
};

export type HydratedDraft = {
  document?: GeneratorDocument;
  name?: string;
  cloud?: Omit<CloudOrigin, "type" | "validated">;
};

export type GeneratorEditorState = {
  document: GeneratorDocument;
  name: string;
  origin: EditorOrigin;
  sync: SyncState;
  hydration: "pending" | "ready" | "failed";
  query: string;
  activeCategory: "all" | GeneratorModuleId;
  configPanelOpen: boolean;
  sliderActive: boolean;
};

export type GeneratorEditorActions = {
  hydrateDraft(draft: HydratedDraft): void;
  hydrationFailed(): void;
  replaceDocument(document: GeneratorDocument): void;
  updateCommand(name: string, value: string | number | boolean): void;
  setName(name: string): void;
  setQuery(query: string): void;
  setActiveCategory(category: "all" | GeneratorModuleId): void;
  setConfigPanelOpen(open: boolean): void;
  setSliderActive(active: boolean): void;
  createAnonymousDocument(configType: ConfigType, name: string): void;
  importDocument(document: GeneratorDocument, name?: string): void;
  beginCloudLoad(): void;
  loadCloudConfig(config: LoadedCloudConfig): void;
  validateCloudOrigin(revision: number): void;
  detachCloud(name?: string): void;
  autosaveQueued(queuedAt: string, online: boolean): void;
  autosaveStarted(mutationId: string, fingerprint: string): void;
  autosaveSucceeded(config: SavedCloudConfig, fingerprint: string): void;
  autosaveFailed(mutationId: string, code?: string, serverRevision?: number): void;
  manualSaveSucceeded(config: SavedCloudConfig): void;
};

export type GeneratorEditorStore = GeneratorEditorState & GeneratorEditorActions;
export type GeneratorEditorStoreApi = Mutate<
  StoreApi<GeneratorEditorStore>,
  [["zustand/subscribeWithSelector", never]]
>;

export function editorFingerprint(name: string, document: GeneratorDocument) {
  return JSON.stringify({ name, values: document });
}

function editedSyncState(state: GeneratorEditorState): SyncState {
  if (state.origin.type !== "cloud") return { status: "local" };
  if (state.sync.status === "conflict") return state.sync;
  const dirtySince = state.sync.status === "dirty" ? state.sync.dirtySince : Date.now();
  return { status: "dirty", dirtySince };
}

export function createGeneratorEditorStore(initial?: Partial<GeneratorEditorState>) {
  return createStore<GeneratorEditorStore>()(subscribeWithSelector((set) => ({
    document: createDefaultDocument(),
    name: "Meine Matchmaking Config",
    origin: { type: "anonymous" },
    sync: { status: "hydrating" },
    hydration: "pending",
    query: "",
    activeCategory: "all",
    configPanelOpen: true,
    sliderActive: false,
    ...initial,

    hydrateDraft(draft) {
      set((state) => {
        const document = draft.document ? normalizeDocument(draft.document) : state.document;
        const name = draft.name ?? state.name;
        const origin: EditorOrigin = draft.cloud
          ? { type: "cloud", ...draft.cloud, validated: false }
          : { type: "anonymous" };
        return {
          document,
          name,
          origin,
          hydration: "ready",
          sync: origin.type === "cloud" ? { status: "hydrating" } : { status: "local" },
        };
      });
    },

    hydrationFailed() {
      set({ hydration: "failed", origin: { type: "anonymous" }, sync: { status: "local" } });
    },

    replaceDocument(document) {
      set((state) => ({ document: normalizeDocument(document), sync: editedSyncState(state) }));
    },

    updateCommand(name, value) {
      set((state) => {
        const commandName = name.startsWith("enabled:") ? name.slice("enabled:".length) : name;
        const command = commands.find((item) => item.name === commandName);
        if (!command || !isCommandEditable(command)) return state;
        const commandValues = { ...state.document.commandValues, [name]: value };
        if (name === "cl_crosshaircolor" && Number(value) === 5) {
          commandValues["enabled:cl_crosshaircolor_r"] = true;
          commandValues["enabled:cl_crosshaircolor_g"] = true;
          commandValues["enabled:cl_crosshaircolor_b"] = true;
        }
        return {
          document: { ...state.document, commandValues },
          sync: editedSyncState(state),
        };
      });
    },

    setName(name) {
      set((state) => ({ name, sync: editedSyncState(state) }));
    },
    setQuery(query) { set({ query }); },
    setActiveCategory(activeCategory) { set({ activeCategory }); },
    setConfigPanelOpen(configPanelOpen) { set({ configPanelOpen }); },
    setSliderActive(sliderActive) { set({ sliderActive }); },

    createAnonymousDocument(configType, name) {
      set({
        document: createDefaultDocument(configType),
        name,
        origin: { type: "anonymous" },
        sync: { status: "local" },
        query: "",
        activeCategory: "all",
      });
    },

    importDocument(document, name) {
      set((state) => ({
        document: normalizeDocument(document),
        name: name ?? state.name,
        origin: { type: "anonymous" },
        sync: { status: "local" },
        query: "",
        activeCategory: "all",
      }));
    },

    beginCloudLoad() {
      set({ sync: { status: "hydrating" } });
    },

    loadCloudConfig(config) {
      const document = normalizeDocument(config.values);
      const fingerprint = editorFingerprint(config.name, document);
      set({
        document,
        name: config.name,
        origin: {
          type: "cloud",
          configId: config.id,
          revision: config.revision,
          lastSyncedFingerprint: fingerprint,
          validated: true,
        },
        sync: { status: "saved", savedAt: config.updatedAt },
        query: "",
        activeCategory: "all",
      });
    },

    validateCloudOrigin(revision) {
      set((state) => {
        if (state.origin.type !== "cloud") return state;
        if (state.origin.validated && state.origin.revision === revision && state.sync.status !== "hydrating") return state;
        return {
          origin: { ...state.origin, revision, validated: true },
          sync: state.sync.status === "hydrating" ? { status: "saved", savedAt: null } : state.sync,
        };
      });
    },

    detachCloud(name) {
      set((state) => ({
        name: name ?? state.name,
        origin: { type: "anonymous" },
        sync: { status: "local" },
      }));
    },

    autosaveQueued(queuedAt, online) {
      set((state) => {
        if (state.origin.type !== "cloud") return state;
        if (!online) return { sync: { status: "offline", queuedAt } };
        const dirtySince = state.sync.status === "dirty" ? state.sync.dirtySince : Date.now();
        return { sync: { status: "dirty", dirtySince } };
      });
    },

    autosaveStarted(mutationId, fingerprint) {
      set({ sync: { status: "syncing", mutationId, fingerprint } });
    },

    autosaveSucceeded(config, fingerprint) {
      set((state) => {
        if (state.origin.type !== "cloud" || state.origin.configId !== config.id) return state;
        const currentFingerprint = editorFingerprint(state.name, state.document);
        const latest = currentFingerprint === fingerprint;
        return {
          origin: {
            ...state.origin,
            revision: config.revision,
            lastSyncedFingerprint: latest ? fingerprint : state.origin.lastSyncedFingerprint,
            validated: true,
          },
          sync: latest
            ? { status: "saved", savedAt: config.updatedAt }
            : { status: "dirty", dirtySince: Date.now() },
        };
      });
    },

    autosaveFailed(mutationId, code, serverRevision) {
      set({
        sync: code === "CONFLICT"
          ? { status: "conflict", localMutationId: mutationId, serverRevision }
          : { status: "offline", queuedAt: new Date().toISOString() },
      });
    },

    manualSaveSucceeded(config) {
      const document = normalizeDocument(config.values);
      const fingerprint = editorFingerprint(config.name, document);
      set({
        document,
        name: config.name,
        origin: {
          type: "cloud",
          configId: config.id,
          revision: config.revision,
          lastSyncedFingerprint: fingerprint,
          validated: true,
        },
        sync: { status: "saved", savedAt: config.updatedAt },
      });
    },
  })));
}

const GeneratorEditorStoreContext = createContext<GeneratorEditorStoreApi | null>(null);

export function GeneratorEditorStoreProvider({ children, initialName }: { children: ReactNode; initialName: string }) {
  const [store] = useState(() => createGeneratorEditorStore({ name: initialName }));
  return createElement(GeneratorEditorStoreContext.Provider, { value: store }, children);
}

export function useGeneratorEditorStore<T>(selector: (state: GeneratorEditorStore) => T): T {
  const store = useContext(GeneratorEditorStoreContext);
  if (!store) throw new Error("useGeneratorEditorStore must be used inside GeneratorEditorStoreProvider");
  return useStore(store, selector);
}

export function useGeneratorEditorStoreApi() {
  const store = useContext(GeneratorEditorStoreContext);
  if (!store) throw new Error("useGeneratorEditorStoreApi must be used inside GeneratorEditorStoreProvider");
  return store;
}
