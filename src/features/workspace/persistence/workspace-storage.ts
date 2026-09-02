import { normalizeDocument } from "@/features/generator/domain/document";
import { draftStorageKeys } from "@/features/generator/persistence/draft-store";
import {
  createEmptyWorkspace,
  createLocalConfig,
  normalizeWorkspace,
  tabId,
  WORKSPACE_SCHEMA_VERSION,
  type StoredWorkspace,
} from "../domain/workspace";
import type { WorkspaceState, WorkspaceStoreApi } from "../state/workspace-store";

const WORKSPACE_KEY = "unbindall:workspace";
const PERSIST_DELAY_MS = 250;

export type WorkspaceStorage = Pick<Storage, "getItem" | "setItem">;

/**
 * Visitors from before the project layer only ever had one anonymous draft.
 * It becomes the first file of the default project so nobody loses work.
 */
function adoptLegacyDraft(storage: WorkspaceStorage): StoredWorkspace {
  const workspace = createEmptyWorkspace();
  const rawDocument = storage.getItem(draftStorageKeys.document);
  if (!rawDocument) return workspace;

  try {
    const document = normalizeDocument(JSON.parse(rawDocument));
    let name = "Meine Config";
    const rawMeta = storage.getItem(draftStorageKeys.metadata);
    if (rawMeta) {
      const meta = JSON.parse(rawMeta) as { name?: unknown };
      if (typeof meta.name === "string" && meta.name.trim()) name = meta.name;
    }
    const config = createLocalConfig(workspace.projects[0].id, name, document.configType, document);
    return {
      ...workspace,
      configs: [config],
      tabs: [{ kind: "config", configId: config.id }],
      activeTabId: tabId({ kind: "config", configId: config.id }),
    };
  } catch {
    return workspace;
  }
}

function stripTabId(tab: StoredWorkspace["tabs"][number] & { id?: string }): StoredWorkspace["tabs"][number] {
  if (tab.kind === "config") return { kind: tab.kind, configId: tab.configId };
  if (tab.kind === "community-detail") return { kind: tab.kind, slug: tab.slug };
  if (tab.kind === "profile") return { kind: tab.kind, handle: tab.handle };
  return { kind: tab.kind };
}

export function readWorkspace(storage: WorkspaceStorage): StoredWorkspace {
  const raw = storage.getItem(WORKSPACE_KEY);
  if (!raw) return adoptLegacyDraft(storage);
  try {
    return normalizeWorkspace(JSON.parse(raw), normalizeDocument);
  } catch {
    return createEmptyWorkspace();
  }
}

export function writeWorkspace(storage: WorkspaceStorage, state: WorkspaceState) {
  try {
    const payload: StoredWorkspace = {
      schemaVersion: WORKSPACE_SCHEMA_VERSION,
      projects: state.projects,
      configs: state.configs,
      tabs: state.tabs.map((tab) => stripTabId(tab)),
      activeTabId: state.activeTabId,
    };
    storage.setItem(WORKSPACE_KEY, JSON.stringify(payload));
    return true;
  } catch {
    return false;
  }
}

export function hydrateWorkspaceStore(store: WorkspaceStoreApi, storage: WorkspaceStorage) {
  try {
    store.getState().hydrate(readWorkspace(storage));
  } catch {
    store.getState().hydrate(createEmptyWorkspace());
  }
}

export function startWorkspacePersistence(store: WorkspaceStoreApi, storage: WorkspaceStorage) {
  let pending: WorkspaceState | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;

  function flush() {
    if (timer !== null) clearTimeout(timer);
    timer = null;
    if (!pending) return;
    writeWorkspace(storage, pending);
    pending = null;
  }

  const unsubscribe = store.subscribe((state, previous) => {
    if (!state.hydrated) return;
    if (
      state.projects === previous.projects &&
      state.configs === previous.configs &&
      state.tabs === previous.tabs &&
      state.activeTabId === previous.activeTabId
    ) return;
    pending = state;
    if (timer !== null) clearTimeout(timer);
    // A local edit may update a document dozens of times per second. Persist
    // the latest workspace snapshot once after the burst instead of blocking
    // every input event with a full synchronous serialization.
    timer = setTimeout(flush, PERSIST_DELAY_MS);
  });

  const onPageHide = () => flush();
  if (typeof window !== "undefined") window.addEventListener("pagehide", onPageHide);

  return () => {
    unsubscribe();
    if (typeof window !== "undefined") window.removeEventListener("pagehide", onPageHide);
    flush();
  };
}

export const workspaceStorageKey = WORKSPACE_KEY;
