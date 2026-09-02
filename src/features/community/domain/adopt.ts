import type { CommandDefinition } from "@/features/generator/catalog/commands";
import { resolveBindings, sanitizeKey, validateCustomCommand } from "@/features/generator/domain/bindings";
import { isCommandAvailable } from "@/features/generator/domain/config-types";
import type { GeneratorDocument } from "@/features/generator/domain/types";

/**
 * Adopting a whole config is the common case; adopting one part of it is the
 * reason a structured document exists at all. The selection mirrors the
 * generator's own modules so the picker shows the same areas the editor does.
 */
export type AdoptSelection = {
  commandCategories: string[];
  standardBinds: boolean;
  multiBinds: boolean;
  customBinds: boolean;
  importedFiles: boolean;
};

export type AdoptConflictKind = "command" | "bind-key";

export type AdoptConflict = {
  /** Stable across the detect/resolve round-trip. */
  id: string;
  kind: AdoptConflictKind;
  label: string;
  current: string;
  incoming: string;
};

export type AdoptResolution = "incoming" | "current";

export type AdoptResult = {
  document: GeneratorDocument;
  conflicts: AdoptConflict[];
  applied: { commands: number; standardBinds: number; multiBinds: number; customBinds: number; importedFiles: number };
};

export const emptySelection: AdoptSelection = {
  commandCategories: [],
  standardBinds: false,
  multiBinds: false,
  customBinds: false,
  importedFiles: false,
};

export function fullSelection(catalog: CommandDefinition[]): AdoptSelection {
  return {
    commandCategories: [...new Set(catalog.map((command) => command.category))],
    standardBinds: true,
    multiBinds: true,
    customBinds: true,
    importedFiles: true,
  };
}

const maxImportedFiles = 10;

function enabledValue(document: GeneratorDocument, name: string) {
  return document.commandValues[`enabled:${name}`] === true;
}

function keyOwners(document: GeneratorDocument) {
  const owners = new Map<string, string>();
  for (const binding of resolveBindings(document)) {
    if (!owners.has(binding.key)) owners.set(binding.key, binding.command);
  }
  return owners;
}

/**
 * Merges selected parts of a published document into the workspace document.
 *
 * Nothing is resolved silently. Every value that would overwrite a different
 * existing value is reported as a conflict; `resolutions` decides per conflict,
 * defaulting to the incoming value so a first pass shows what would change.
 */
export function mergeDocument(
  target: GeneratorDocument,
  source: GeneratorDocument,
  selection: AdoptSelection,
  catalog: CommandDefinition[],
  resolutions: Record<string, AdoptResolution> = {},
): AdoptResult {
  const document: GeneratorDocument = {
    ...target,
    commandValues: { ...target.commandValues },
    standardBinds: target.standardBinds.map((bind) => ({ ...bind })),
    multiBinds: target.multiBinds.map((bind) => ({ ...bind, keys: [...bind.keys] })),
    customBinds: target.customBinds.map((bind) => ({ ...bind })),
    importedFiles: [...target.importedFiles],
  };
  const conflicts: AdoptConflict[] = [];
  const applied = { commands: 0, standardBinds: 0, multiBinds: 0, customBinds: 0, importedFiles: 0 };
  const categories = new Set(selection.commandCategories);

  for (const command of catalog) {
    if (!categories.has(command.category)) continue;
    if (!enabledValue(source, command.name)) continue;
    // A command that cannot run in the target config type is never adopted,
    // however the reader selected it.
    if (!isCommandAvailable(document.configType, command)) continue;

    const incoming = source.commandValues[command.name];
    if (incoming === undefined) continue;
    const current = document.commandValues[command.name];
    const id = `command:${command.name}`;

    if (enabledValue(document, command.name) && current !== undefined && current !== incoming) {
      conflicts.push({
        id,
        kind: "command",
        label: command.label,
        current: String(current),
        incoming: String(incoming),
      });
      if (resolutions[id] === "current") continue;
    }

    document.commandValues[command.name] = incoming;
    document.commandValues[`enabled:${command.name}`] = true;
    applied.commands += 1;
  }

  if (selection.standardBinds) {
    for (const bind of source.standardBinds) {
      if (!bind.enabled) continue;
      const key = sanitizeKey(bind.key);
      if (!key) continue;
      const id = `standard:${bind.actionId}`;
      const existing = document.standardBinds.find((item) => item.actionId === bind.actionId);

      if (existing?.enabled && sanitizeKey(existing.key) !== key) {
        conflicts.push({ id, kind: "bind-key", label: bind.actionId, current: existing.key, incoming: bind.key });
        if (resolutions[id] === "current") continue;
      }

      if (existing) {
        existing.key = bind.key;
        existing.enabled = true;
      } else {
        document.standardBinds.push({ ...bind });
      }
      applied.standardBinds += 1;
    }
  }

  if (selection.multiBinds) {
    for (const bind of source.multiBinds) {
      const id = `multi:${bind.id}`;
      const occupied = keyOwners(document);
      const clash = bind.keys.map(sanitizeKey).find((key) => key && occupied.has(key));
      if (clash) {
        conflicts.push({ id, kind: "bind-key", label: bind.label, current: occupied.get(clash) ?? clash, incoming: clash });
        if (resolutions[id] === "current") continue;
      }
      const index = document.multiBinds.findIndex((item) => item.id === bind.id);
      if (index >= 0) document.multiBinds[index] = { ...bind, keys: [...bind.keys] };
      else document.multiBinds.push({ ...bind, keys: [...bind.keys] });
      applied.multiBinds += 1;
    }
  }

  if (selection.customBinds) {
    for (const bind of source.customBinds) {
      // Custom binds from a stranger pass the same gate as your own.
      if (validateCustomCommand(bind.command)) continue;
      const id = `custom:${bind.id}`;
      const occupied = keyOwners(document);
      const key = sanitizeKey(bind.key);
      const owner = key ? occupied.get(key) : undefined;
      if (owner && owner !== bind.command.trim()) {
        conflicts.push({ id, kind: "bind-key", label: bind.label || bind.command, current: owner, incoming: bind.command });
        if (resolutions[id] === "current") continue;
      }
      const index = document.customBinds.findIndex((item) => item.id === bind.id);
      if (index >= 0) document.customBinds[index] = { ...bind };
      else document.customBinds.push({ ...bind });
      applied.customBinds += 1;
    }
  }

  if (selection.importedFiles) {
    for (const file of source.importedFiles) {
      if (document.importedFiles.length >= maxImportedFiles) break;
      if (document.importedFiles.some((item) => item.name === file.name && item.source === file.source)) continue;
      document.importedFiles.push({ ...file });
      applied.importedFiles += 1;
    }
  }

  return { document, conflicts, applied };
}

export function selectionIsEmpty(selection: AdoptSelection) {
  return !selection.commandCategories.length &&
    !selection.standardBinds &&
    !selection.multiBinds &&
    !selection.customBinds &&
    !selection.importedFiles;
}
