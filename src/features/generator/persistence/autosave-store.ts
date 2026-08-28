import type { GeneratorDocument } from "../domain/types";

export type PendingAutosave = {
  id: string;
  expectedRevision: number;
  mutationId: string;
  name: string;
  values: GeneratorDocument;
  rawConfig: string;
  fingerprint: string;
  queuedAt: string;
};

const DATABASE_NAME = "unbindall-local";
const STORE_NAME = "pending-autosaves";
const DATABASE_VERSION = 1;

export async function putPendingAutosave(value: PendingAutosave) {
  const database = await openDatabase();
  await requestToPromise(database.transaction(STORE_NAME, "readwrite").objectStore(STORE_NAME).put(value));
  database.close();
}

export async function getPendingAutosave(id: string) {
  const database = await openDatabase();
  const value = await requestToPromise(database.transaction(STORE_NAME).objectStore(STORE_NAME).get(id));
  database.close();
  return value as PendingAutosave | undefined;
}

export async function removePendingAutosave(id: string, mutationId?: string) {
  const database = await openDatabase();
  const transaction = database.transaction(STORE_NAME, "readwrite");
  const store = transaction.objectStore(STORE_NAME);
  if (mutationId) {
    const current = await requestToPromise(store.get(id)) as PendingAutosave | undefined;
    if (current?.mutationId !== mutationId) {
      database.close();
      return;
    }
  }
  await requestToPromise(store.delete(id));
  database.close();
}

function openDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) database.createObjectStore(STORE_NAME, { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Lokaler Speicher konnte nicht geöffnet werden."));
  });
}

function requestToPromise<T>(request: IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Lokaler Speicherzugriff fehlgeschlagen."));
  });
}
