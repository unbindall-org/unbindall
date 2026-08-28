export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

export type JsonPatchOperation =
  | { op: "add" | "replace"; path: (string | number)[]; value: JsonValue }
  | { op: "remove"; path: (string | number)[] };

export type JsonPatch = JsonPatchOperation[];

/**
 * Produces a deliberately small patch format for persisted GeneratorDocuments.
 * Objects are compared recursively; arrays are replaced as a unit because their
 * stable item ids make partial array edits more expensive and error-prone than
 * the small amount of storage they would save here.
 */
export function createJsonPatch(previous: JsonValue, next: JsonValue): JsonPatch {
  const operations: JsonPatch = [];
  diff(previous, next, [], operations);
  return operations;
}

export function applyJsonPatch(document: JsonValue, patch: JsonPatch): JsonValue {
  let result = clone(document);

  for (const operation of patch) {
    if (operation.path.length === 0) {
      if (operation.op === "remove") throw new Error("Das Wurzeldokument kann nicht entfernt werden.");
      result = clone(operation.value);
      continue;
    }

    const parent = getParent(result, operation.path);
    const key = operation.path.at(-1)!;

    if (Array.isArray(parent)) {
      if (typeof key !== "number" || !Number.isInteger(key) || key < 0) {
        throw new Error("Ungültiger Array-Pfad in der Revision.");
      }
      if (operation.op === "remove") parent.splice(key, 1);
      else if (operation.op === "add") parent.splice(key, 0, clone(operation.value));
      else parent[key] = clone(operation.value);
    } else {
      if (typeof key !== "string") throw new Error("Ungültiger Objekt-Pfad in der Revision.");
      if (operation.op === "remove") delete parent[key];
      else parent[key] = clone(operation.value);
    }
  }

  return result;
}

/** Stable JSON representation used for hashes and meaningful equality checks. */
export function canonicalJson(value: JsonValue): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
}

export function shouldStoreSnapshot(revision: number, patch: JsonPatch, document: JsonValue) {
  if (revision === 1 || revision % 50 === 0) return true;
  return canonicalJson(patch as JsonValue).length >= canonicalJson(document).length * 0.4;
}

function diff(previous: JsonValue, next: JsonValue, path: (string | number)[], operations: JsonPatch) {
  if (Object.is(previous, next)) return;

  if (Array.isArray(previous) || Array.isArray(next)) {
    if (canonicalJson(previous) !== canonicalJson(next)) {
      operations.push({ op: "replace", path, value: clone(next) });
    }
    return;
  }

  if (isObject(previous) && isObject(next)) {
    for (const key of Object.keys(previous)) {
      if (!(key in next)) operations.push({ op: "remove", path: [...path, key] });
    }
    for (const key of Object.keys(next)) {
      if (!(key in previous)) operations.push({ op: "add", path: [...path, key], value: clone(next[key]) });
      else diff(previous[key], next[key], [...path, key], operations);
    }
    return;
  }

  operations.push({ op: "replace", path, value: clone(next) });
}

function getParent(root: JsonValue, path: (string | number)[]) {
  let current = root;
  for (const segment of path.slice(0, -1)) {
    if (Array.isArray(current) && typeof segment === "number") current = current[segment];
    else if (isObject(current) && typeof segment === "string") current = current[segment];
    else throw new Error("Revision enthält einen ungültigen Pfad.");
  }
  if (!Array.isArray(current) && !isObject(current)) throw new Error("Revision verweist nicht auf einen Container.");
  return current;
}

function isObject(value: JsonValue): value is { [key: string]: JsonValue } {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function clone<T extends JsonValue>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
