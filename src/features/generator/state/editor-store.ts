import { createContext, createElement, useContext, useState, type ReactNode } from "react";
import { useStore } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { createStore, type Mutate, type StoreApi } from "zustand/vanilla";
import { commands, isCommandEditable, type CommandDefinition } from "../catalog/commands";
import { createDefaultDocument, normalizeDocument } from "../domain/document";
import type { ConfigType, GeneratorDocument } from "../domain/types";

export type CloudOrigin = {
  type: "cloud";
  configId: string;
  revision: number;
  lastSyncedFingerprint: string;
  validated: boolean;
};

export type EditorOrigin =
  | { type: "anonymous" }
  | { type: "local"; configId: string }
  | CloudOrigin;

export type SyncState =
  | { status: "local" }
  | { status: "hydrating" }
  | { status: "load-error"; configId: string; message: string }
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
  catalog: CommandDefinition[];
  document: GeneratorDocument;
  name: string;
  origin: EditorOrigin;
  sync: SyncState;
  hydration: "pending" | "ready" | "failed";
  query: string;
  /** Whether the editor shows the full catalog in addition to active parts. */
  showAllCommands: boolean;
  sliderActive: boolean;
};

export type GeneratorEditorActions = {
  replaceCatalog(catalog: CommandDefinition[]): void;
  hydrateDraft(draft: HydratedDraft): void;
  hydrationFailed(): void;
  replaceDocument(document: GeneratorDocument): void;
  updateCommand(name: string, value: string | number | boolean): void;
  setName(name: string): void;
  setQuery(query: string): void;
  setShowAllCommands(showAll: boolean): void;
  setSliderActive(active: boolean): void;
  createAnonymousDocument(configType: ConfigType, name: string): void;
  importDocument(document: GeneratorDocument, name?: string, origin?: Extract<EditorOrigin, { type: "local" }>): void;
  beginCloudLoad(): void;
  cloudLoadFailed(configId: string, message: string): void;
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
  if (state.origin.type !== "cloud") return state.sync.status === "local" ? state.sync : { status: "local" };
  if (state.sync.status === "conflict" || state.sync.status === "dirty") return state.sync;
  return { status: "dirty", dirtySince: Date.now() };
}

export function createGeneratorEditorStore(initial?: Partial<GeneratorEditorState>, commandCatalog: CommandDefinition[] = commands) {
  return createStore<GeneratorEditorStore>()(subscribeWithSelector((set) => ({
    catalog: commandCatalog,
    document: createDefaultDocument("matchmaking", commandCatalog),
    name: "Meine Matchmaking Config",
    origin: { type: "anonymous" },
    sync: { status: "hydrating" },
    hydration: "pending",
    query: "",
    showAllCommands: true,
    sliderActive: false,
    ...initial,

    replaceCatalog(catalog) {
      set((state) => ({ catalog, document: normalizeDocument(state.document, catalog) }));
    },

    hydrateDraft(draft) {
      set((state) => {
        const document = draft.document ? normalizeDocument(draft.document, state.catalog) : state.document;
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
      set((state) => ({ document: normalizeDocument(document, state.catalog), sync: editedSyncState(state) }));
    },

    updateCommand(name, value) {
      set((state) => {
        const isEnabledToggle = name.startsWith("enabled:");
        const commandName = isEnabledToggle ? name.slice("enabled:".length) : name;
        const command = state.catalog.find((item) => item.name === commandName);
        if (!command || !isCommandEditable(command)) return state;
        // Value edits always activate the command. Keeping this in one store
        // transaction avoids two complete editor renders for the first slider,
        // text, select, or switch interaction on an inactive command.
        const commandValues = {
          ...state.document.commandValues,
          [name]: value,
          ...(!isEnabledToggle ? { [`enabled:${commandName}`]: true } : {}),
        };
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
    setShowAllCommands(showAllCommands) { set({ showAllCommands }); },
    setSliderActive(sliderActive) { set({ sliderActive }); },

    createAnonymousDocument(configType, name) {
      set((state) => ({
        document: createDefaultDocument(configType, state.catalog),
        name,
        origin: { type: "anonymous" },
        sync: { status: "local" },
        query: "",
        showAllCommands: true,
      }));
    },

    importDocument(document, name, origin) {
      set((state) => ({
        document: normalizeDocument(document, state.catalog),
        name: name ?? state.name,
        origin: origin ?? (state.origin.type === "local" ? state.origin : { type: "anonymous" }),
        sync: { status: "local" },
        query: "",
        showAllCommands: true,
      }));
    },

    beginCloudLoad() {
      set({ sync: { status: "hydrating" } });
    },

    cloudLoadFailed(configId, message) {
      set({ sync: { status: "load-error", configId, message } });
    },

    loadCloudConfig(config) {
      set((state) => {
      const document = normalizeDocument(config.values, state.catalog);
      const fingerprint = editorFingerprint(config.name, document);
      return {
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
        showAllCommands: true,
      };
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
      set((state) => {
      const document = normalizeDocument(config.values, state.catalog);
      const fingerprint = editorFingerprint(config.name, document);
      return {
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
      };
      });
    },
  })));
}

const GeneratorEditorStoreContext = createContext<GeneratorEditorStoreApi | null>(null);

export function GeneratorEditorStoreProvider({
  children,
  initialName,
  catalog,
  initialConfig,
}: {
  children: ReactNode;
  initialName: string;
  catalog: CommandDefinition[];
  initialConfig?: LoadedCloudConfig | null;
}) {
  const [store] = useState(() => {
    if (!initialConfig) return createGeneratorEditorStore({ name: initialName }, catalog);
    const document = normalizeDocument(initialConfig.values, catalog);
    return createGeneratorEditorStore({
      document,
      name: initialConfig.name,
      origin: {
        type: "cloud",
        configId: initialConfig.id,
        revision: initialConfig.revision,
        lastSyncedFingerprint: editorFingerprint(initialConfig.name, document),
        validated: true,
      },
      sync: { status: "saved", savedAt: initialConfig.updatedAt },
      hydration: "ready",
    }, catalog);
  });
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
