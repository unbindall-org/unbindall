import { describe, expect, it, vi } from "vitest";
import { createDefaultDocument } from "../domain/document";
import { createGeneratorEditorStore } from "../state/editor-store";
import { createAutosaveController, type AutosaveRuntime } from "./autosave-controller";
import type { PendingAutosave } from "./autosave-store";

function harness(online = true) {
  let isOnline = online;
  let clock = Date.parse("2026-08-28T12:00:00.000Z");
  let timerId = 0;
  const timers = new Map<number, () => void>();
  const onlineListeners = new Set<() => void>();
  const runtime: AutosaveRuntime = {
    now: () => clock,
    isOnline: () => isOnline,
    createMutationId: () => "2fb84440-7204-4d7d-9f2e-0a4e33f9bf03",
    setTimer(callback) { timerId += 1; timers.set(timerId, callback); return timerId; },
    clearTimer(id) { timers.delete(id); },
    addOnlineListener(callback) { onlineListeners.add(callback); return () => onlineListeners.delete(callback); },
  };
  return {
    runtime,
    setOnline(next: boolean) {
      isOnline = next;
      if (next) for (const listener of onlineListeners) listener();
    },
    advance(milliseconds: number) { clock += milliseconds; },
    runTimer() {
      const entry = timers.entries().next().value as [number, () => void] | undefined;
      if (!entry) throw new Error("No autosave timer scheduled");
      timers.delete(entry[0]);
      entry[1]();
    },
    timerCount: () => timers.size,
  };
}

function cloudStore() {
  const store = createGeneratorEditorStore({ hydration: "ready" });
  store.getState().loadCloudConfig({
    id: "86bbda74-38a5-4580-b0d5-f526ab473fd4",
    name: "Cloud",
    values: createDefaultDocument(),
    revision: 2,
    updatedAt: "2026-08-28T11:00:00.000Z",
  });
  return store;
}

async function flush() {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

describe("autosave controller", () => {
  it("queues an edit and sends it after the debounce", async () => {
    const store = cloudStore();
    const pending = new Map<string, PendingAutosave>();
    const repository = {
      put: vi.fn(async (value: PendingAutosave) => { pending.set(value.id, value); }),
      get: vi.fn(async (id: string) => pending.get(id)),
      remove: vi.fn(async (id: string) => { pending.delete(id); }),
    };
    const api = {
      autosave: vi.fn(async (input: PendingAutosave) => ({
        id: input.id,
        name: input.name,
        values: input.values,
        rawConfig: input.rawConfig,
        revision: 3,
        createdAt: "2026-08-28T10:00:00.000Z",
        updatedAt: "2026-08-28T12:00:01.000Z",
        deletedAt: null,
      })),
    };
    const time = harness();
    const controller = createAutosaveController({
      store,
      api,
      repository,
      serialize: () => "sensitivity 1.5",
      runtime: time.runtime,
    });

    store.getState().updateCommand("sensitivity", 1.5);
    await flush();
    expect(repository.put).toHaveBeenCalledOnce();
    expect(store.getState().sync.status).toBe("dirty");
    expect(time.timerCount()).toBe(1);

    time.runTimer();
    await flush();
    expect(api.autosave).toHaveBeenCalledOnce();
    expect(store.getState().sync.status).toBe("saved");
    expect(store.getState().origin).toMatchObject({ type: "cloud", revision: 3 });
    controller.stop();
  });

  it("keeps an offline edit queued and retries the same mutation online", async () => {
    const store = cloudStore();
    let queued: PendingAutosave | undefined;
    const repository = {
      put: vi.fn(async (value: PendingAutosave) => { queued = value; }),
      get: vi.fn(async () => queued),
      remove: vi.fn(async () => { queued = undefined; }),
    };
    const api = {
      autosave: vi.fn(async (input: PendingAutosave) => ({
        ...input,
        revision: 3,
        updatedAt: "2026-08-28T12:00:01.000Z",
      })),
    };
    const time = harness(false);
    const controller = createAutosaveController({ store, api, repository, serialize: () => "cfg", runtime: time.runtime });
    store.getState().updateCommand("sensitivity", 1.7);
    await flush();

    expect(store.getState().sync.status).toBe("offline");
    expect(queued?.mutationId).toBe("2fb84440-7204-4d7d-9f2e-0a4e33f9bf03");
    const queuedMutationId = queued?.mutationId;
    time.setOnline(true);
    await flush();
    expect(api.autosave).toHaveBeenCalledWith(expect.objectContaining({ mutationId: queuedMutationId }));
    expect(store.getState().sync.status).toBe("saved");
    controller.stop();
  });

  it("enters conflict without scheduling an overwrite retry", async () => {
    const store = cloudStore();
    const time = harness();
    const onConflict = vi.fn();
    const repository = {
      put: vi.fn(async () => undefined),
      get: vi.fn(async () => undefined),
      remove: vi.fn(async () => undefined),
    };
    const api = {
      autosave: vi.fn(async () => {
        throw { data: { code: "CONFLICT" } };
      }),
    };
    const controller = createAutosaveController({ store, api, repository, serialize: () => "cfg", runtime: time.runtime, onConflict });
    store.getState().updateCommand("sensitivity", 1.9);
    await flush();
    time.runTimer();
    await flush();

    expect(store.getState().sync.status).toBe("conflict");
    expect(onConflict).toHaveBeenCalledOnce();
    expect(time.timerCount()).toBe(0);
    controller.stop();
  });

  it("does not autosave a remembered cloud config before server validation", async () => {
    const document = createDefaultDocument();
    const store = createGeneratorEditorStore();
    store.getState().hydrateDraft({
      document,
      name: "Remembered",
      cloud: { configId: "86bbda74-38a5-4580-b0d5-f526ab473fd4", revision: 2, lastSyncedFingerprint: "old" },
    });
    store.getState().updateCommand("sensitivity", 2);
    const time = harness();
    const repository = { put: vi.fn(async () => undefined), get: vi.fn(async () => undefined), remove: vi.fn(async () => undefined) };
    const api = { autosave: vi.fn() };
    const controller = createAutosaveController({ store, api, repository, serialize: () => "cfg", runtime: time.runtime });
    await flush();

    expect(repository.put).not.toHaveBeenCalled();
    expect(api.autosave).not.toHaveBeenCalled();
    controller.stop();
  });
});
