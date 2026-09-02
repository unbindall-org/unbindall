import type { PendingAutosave } from "./autosave-store";
import { editorFingerprint, type GeneratorEditorStore, type GeneratorEditorStoreApi, type SavedCloudConfig } from "../state/editor-store";

export type PendingAutosaveRepository = {
  put(value: PendingAutosave): Promise<void>;
  get(id: string): Promise<PendingAutosave | undefined>;
  remove(id: string, mutationId?: string): Promise<void>;
};

export type AutosaveApi = {
  autosave(input: Pick<PendingAutosave, "id" | "expectedRevision" | "mutationId" | "name" | "values" | "rawConfig">): Promise<SavedCloudConfig>;
};

export type AutosaveRuntime = {
  now(): number;
  isOnline(): boolean;
  createMutationId(): string;
  setTimer(callback: () => void, delay: number): number;
  clearTimer(timer: number): void;
  addOnlineListener(callback: () => void): () => void;
};

type AutosaveControllerOptions = {
  store: GeneratorEditorStoreApi;
  api: AutosaveApi;
  repository: PendingAutosaveRepository;
  serialize(state: GeneratorEditorStore): string;
  runtime?: AutosaveRuntime;
  onSaved?(config: SavedCloudConfig): void;
  onConflict?(): void;
};

function browserRuntime(): AutosaveRuntime {
  return {
    now: Date.now,
    isOnline: () => navigator.onLine,
    createMutationId: () => crypto.randomUUID(),
    setTimer: (callback, delay) => window.setTimeout(callback, delay),
    clearTimer: (timer) => window.clearTimeout(timer),
    addOnlineListener(callback) {
      window.addEventListener("online", callback);
      return () => window.removeEventListener("online", callback);
    },
  };
}

export function autosaveErrorCode(error: unknown) {
  if (!error || typeof error !== "object" || !("data" in error)) return undefined;
  return (error.data as { code?: unknown } | undefined)?.code as string | undefined;
}

function autosaveCandidateKey(state: GeneratorEditorStore) {
  if (state.hydration !== "ready" || state.origin.type !== "cloud" || !state.origin.validated) return null;
  if (state.sync.status === "conflict") return null;
  // Slider input can fire for every pointer movement. The draft layer keeps
  // that work recoverable; defer fingerprinting and IndexedDB writes until the
  // pointer is released and one final value remains.
  if (state.sliderActive) return null;
  const fingerprint = editorFingerprint(state.name, state.document);
  if (fingerprint === state.origin.lastSyncedFingerprint) return null;
  return `${state.origin.configId}:${state.origin.revision}:${fingerprint}`;
}

export function createAutosaveController(options: AutosaveControllerOptions) {
  const runtime = options.runtime ?? browserRuntime();
  let timer: number | null = null;
  let inFlight = false;
  let stopped = false;

  function clearScheduled() {
    if (timer !== null) runtime.clearTimer(timer);
    timer = null;
  }

  function pendingFromState(state: GeneratorEditorStore): PendingAutosave | null {
    if (state.origin.type !== "cloud" || !state.origin.validated) return null;
    return {
      id: state.origin.configId,
      expectedRevision: state.origin.revision,
      mutationId: runtime.createMutationId(),
      name: state.name,
      values: state.document,
      rawConfig: options.serialize(state),
      fingerprint: editorFingerprint(state.name, state.document),
      queuedAt: new Date(runtime.now()).toISOString(),
    };
  }

  async function send(pending: PendingAutosave) {
    if (stopped || inFlight) return;
    if (!runtime.isOnline()) {
      options.store.getState().autosaveQueued(pending.queuedAt, false);
      return;
    }

    inFlight = true;
    options.store.getState().autosaveStarted(pending.mutationId, pending.fingerprint);
    try {
      const saved = await options.api.autosave({
        id: pending.id,
        expectedRevision: pending.expectedRevision,
        mutationId: pending.mutationId,
        name: pending.name,
        values: pending.values,
        rawConfig: pending.rawConfig,
      });
      options.store.getState().autosaveSucceeded(saved, pending.fingerprint);
      await options.repository.remove(pending.id, pending.mutationId).catch(() => undefined);
      options.onSaved?.(saved);
    } catch (error) {
      const code = autosaveErrorCode(error);
      options.store.getState().autosaveFailed(pending.mutationId, code);
      if (code === "CONFLICT") options.onConflict?.();
    } finally {
      inFlight = false;
      const state = options.store.getState();
      if (autosaveCandidateKey(state)) void queueAndSchedule(state);
    }
  }

  async function queueAndSchedule(state: GeneratorEditorStore) {
    const pending = pendingFromState(state);
    if (!pending || state.sync.status === "conflict") return;
    await options.repository.put(pending).catch(() => undefined);
    const online = runtime.isOnline();
    options.store.getState().autosaveQueued(pending.queuedAt, online);
    clearScheduled();
    if (!online || state.sliderActive || inFlight) return;

    const currentSync = options.store.getState().sync;
    const dirtySince = currentSync.status === "dirty" ? currentSync.dirtySince : runtime.now();
    const elapsed = runtime.now() - dirtySince;
    const delay = Math.max(0, Math.min(1_000, 5_000 - elapsed));
    timer = runtime.setTimer(() => {
      timer = null;
      void send(pending);
    }, delay);
  }

  async function retryPending() {
    const state = options.store.getState();
    if (state.origin.type !== "cloud" || !state.origin.validated || !runtime.isOnline()) return;
    const pending = await options.repository.get(state.origin.configId).catch(() => undefined);
    const fingerprint = editorFingerprint(state.name, state.document);
    if (pending?.fingerprint === fingerprint) await send(pending);
    else if (autosaveCandidateKey(state)) await queueAndSchedule(state);
  }

  const unsubscribeStore = options.store.subscribe(
    autosaveCandidateKey,
    (key) => {
      if (!key) {
        clearScheduled();
        return;
      }
      void queueAndSchedule(options.store.getState());
    },
    { fireImmediately: true },
  );
  const unsubscribeOnline = runtime.addOnlineListener(() => void retryPending());

  return {
    retryPending,
    stop() {
      stopped = true;
      clearScheduled();
      unsubscribeStore();
      unsubscribeOnline();
    },
  };
}
