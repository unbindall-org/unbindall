import { normalizeDocument } from "../domain/document";
import type { GeneratorEditorState, GeneratorEditorStoreApi, HydratedDraft } from "../state/editor-store";

const DRAFT_KEY = "unbindall:draft";
const META_KEY = "unbindall:draft-meta";
const PERSIST_DELAY_MS = 250;

export type DraftStorage = Pick<Storage, "getItem" | "setItem">;

type StoredDraftMeta = {
  name?: unknown;
  currentId?: unknown;
  revision?: unknown;
  syncedFingerprint?: unknown;
};

export function readDraft(storage: DraftStorage, restoreCloud: boolean): HydratedDraft {
  const draft: HydratedDraft = {};
  const rawDocument = storage.getItem(DRAFT_KEY);
  if (rawDocument) {
    try {
      draft.document = normalizeDocument(JSON.parse(rawDocument));
    } catch {
      // An invalid or outdated local draft must never prevent the editor from opening.
    }
  }

  const rawMeta = storage.getItem(META_KEY);
  if (!rawMeta) return draft;
  try {
    const meta = JSON.parse(rawMeta) as StoredDraftMeta;
    if (typeof meta.name === "string") draft.name = meta.name;
    if (restoreCloud && typeof meta.currentId === "string" && typeof meta.revision === "number") {
      draft.cloud = {
        configId: meta.currentId,
        revision: meta.revision,
        lastSyncedFingerprint: typeof meta.syncedFingerprint === "string" ? meta.syncedFingerprint : "",
      };
    }
  } catch {
    // Keep the valid document even when metadata cannot be parsed.
  }
  return draft;
}

export function writeDraft(storage: DraftStorage, state: GeneratorEditorState) {
  try {
    storage.setItem(DRAFT_KEY, JSON.stringify(state.document));
    storage.setItem(META_KEY, JSON.stringify({
      name: state.name,
      currentId: state.origin.type === "cloud" ? state.origin.configId : null,
      revision: state.origin.type === "cloud" ? state.origin.revision : 0,
      syncedFingerprint: state.origin.type === "cloud" ? state.origin.lastSyncedFingerprint : "",
    }));
    return true;
  } catch {
    return false;
  }
}

export function hydrateDraftStore(store: GeneratorEditorStoreApi, storage: DraftStorage, restoreCloud: boolean) {
  try {
    store.getState().hydrateDraft(readDraft(storage, restoreCloud));
    return true;
  } catch {
    store.getState().hydrationFailed();
    return false;
  }
}

export function startDraftPersistence(store: GeneratorEditorStoreApi, storage: DraftStorage) {
  let pending: GeneratorEditorState | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;

  function flush() {
    if (timer !== null) clearTimeout(timer);
    timer = null;
    if (!pending) return;
    writeDraft(storage, pending);
    pending = null;
  }

  const unsubscribe = store.subscribe((state, previous) => {
    if (state.hydration !== "ready") return;
    const contentChanged = state.document !== previous.document || state.name !== previous.name || state.origin !== previous.origin;
    if (contentChanged) pending = state;
    if (!pending) return;
    if (timer !== null) clearTimeout(timer);
    timer = null;
    if (state.sliderActive) return;
    // localStorage and JSON.stringify are synchronous. Coalesce rapid slider
    // and text events so they cannot monopolize the interaction frame.
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

export const draftStorageKeys = { document: DRAFT_KEY, metadata: META_KEY } as const;
