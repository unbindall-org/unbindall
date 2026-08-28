import { bindActions, commands, createDefaultState, presets, type ConfigState } from "../catalog/commands";
import {
  GENERATOR_SCHEMA_VERSION,
  type ConfigType,
  type CustomBind,
  type GeneratorDocument,
  type ImportedConfigFile,
  type MultiBind,
  type StandardBind,
} from "./types";
import { isCommandAvailable } from "./config-types";

function createId(prefix: string) {
  const id = globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);
  return `${prefix}-${id}`;
}

export function createDefaultDocument(configType: ConfigType = "matchmaking"): GeneratorDocument {
  const document: GeneratorDocument = {
    schemaVersion: GENERATOR_SCHEMA_VERSION,
    configType,
    commandValues: createDefaultState(),
    standardBinds: bindActions.map((action) => ({
      actionId: action.id,
      key: action.defaultKey,
      enabled: action.defaultEnabled,
    })),
    multiBinds: [
      {
        id: createId("multi"),
        label: "Smoke auf C + Maustaste",
        actionId: "smoke",
        keys: ["c", "mouse5"],
        enabled: false,
      },
    ],
    customBinds: [],
    importedFiles: [],
  };

  if (configType !== "matchmaking") {
    document.standardBinds = document.standardBinds.map((binding) => ({ ...binding, enabled: false }));
    for (const command of commands) document.commandValues[`enabled:${command.name}`] = false;
    for (const command of commands.filter((item) => isCommandAvailable(configType, item))) {
      document.commandValues[`enabled:${command.name}`] = Boolean(command.enabledByDefault);
    }
  }

  const presetName = configType === "practice" ? "practice"
    : configType === "server" ? "server-competitive" : null;
  const preset = presets.find((item) => item.name === presetName);
  if (preset) enableValues(document, preset.values);

  if (configType === "offline") enableValues(document, {
    mp_autoteambalance: false,
    mp_limitteams: 0,
    mp_friendlyfire: false,
    mp_freezetime: 5,
    mp_roundtime_defuse: 10,
    mp_maxrounds: 24,
    mp_startmoney: 800,
    mp_buytime: 30,
    bot_difficulty: 1,
    mp_restartgame: 1,
  });

  if (configType === "warmup") enableValues(document, {
    mp_warmuptime: 300,
    mp_warmup_pausetimer: false,
  });

  return document;
}

export function normalizeDocument(value: unknown): GeneratorDocument {
  const candidate = value && typeof value === "object" ? value as Record<string, unknown> : null;
  const configType = isConfigType(candidate?.configType) ? candidate.configType : "matchmaking";
  const defaults = createDefaultDocument(configType);
  if (!candidate) return defaults;

  if ([1, 2, GENERATOR_SCHEMA_VERSION].includes(Number(candidate.schemaVersion)) && candidate.commandValues) {
    return {
      schemaVersion: GENERATOR_SCHEMA_VERSION,
      configType,
      commandValues: {
        ...defaults.commandValues,
        ...sanitizeCommandValues(candidate.commandValues),
      },
      standardBinds: normalizeStandardBinds(candidate.standardBinds, defaults.standardBinds),
      multiBinds: normalizeMultiBinds(candidate.multiBinds),
      customBinds: normalizeCustomBinds(candidate.customBinds),
      importedFiles: normalizeImportedFiles(candidate.importedFiles),
    };
  }

  // Legacy drafts/configs stored command values and binds in one flat object.
  const legacy = sanitizeCommandValues(candidate);
  return {
    ...defaults,
    commandValues: { ...defaults.commandValues, ...legacy },
    standardBinds: defaults.standardBinds.map((binding) => ({
      ...binding,
      key: typeof candidate[`bind:${binding.actionId}`] === "string"
        ? String(candidate[`bind:${binding.actionId}`])
        : binding.key,
      enabled: typeof candidate[`enabled:bind:${binding.actionId}`] === "boolean"
        ? Boolean(candidate[`enabled:bind:${binding.actionId}`])
        : binding.enabled,
    })),
  };
}

export function createMultiBind(): MultiBind {
  return { id: createId("multi"), label: "Neuer Mehrfachbind", actionId: "smoke", keys: ["", ""], enabled: true };
}

export function createCustomBind(): CustomBind {
  return { id: createId("custom"), label: "Eigener Bind", key: "", command: "", enabled: true };
}

function sanitizeCommandValues(value: unknown): ConfigState {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value).filter(([, item]) => ["string", "number", "boolean"].includes(typeof item)),
  ) as ConfigState;
}

function enableValues(document: GeneratorDocument, values: ConfigState) {
  for (const [name, value] of Object.entries(values)) {
    document.commandValues[name] = value;
    const command = commands.find((item) => item.name === name);
    if (command && isCommandAvailable(document.configType, command)) {
      document.commandValues[`enabled:${name}`] = true;
    }
  }
}

function isConfigType(value: unknown): value is ConfigType {
  return ["matchmaking", "practice", "server", "offline", "warmup", "launch-options"].includes(String(value));
}

function normalizeStandardBinds(value: unknown, defaults: StandardBind[]) {
  if (!Array.isArray(value)) return defaults;
  const provided = new Map(
    value.filter(isStandardBind).map((binding) => [binding.actionId, binding]),
  );
  return defaults.map((binding) => ({ ...binding, ...provided.get(binding.actionId) }));
}

function normalizeMultiBinds(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.filter(isMultiBind).map((binding) => ({ ...binding, keys: binding.keys.slice(0, 4) }));
}

function normalizeCustomBinds(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.filter(isCustomBind);
}

function normalizeImportedFiles(value: unknown): ImportedConfigFile[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isImportedConfigFile).slice(0, 10);
}

function isStandardBind(value: unknown): value is StandardBind {
  if (!value || typeof value !== "object") return false;
  const item = value as StandardBind;
  return typeof item.actionId === "string" && typeof item.key === "string" && typeof item.enabled === "boolean";
}

function isMultiBind(value: unknown): value is MultiBind {
  if (!value || typeof value !== "object") return false;
  const item = value as MultiBind;
  return typeof item.id === "string" && typeof item.label === "string" && typeof item.actionId === "string" &&
    Array.isArray(item.keys) && item.keys.every((key) => typeof key === "string") && typeof item.enabled === "boolean";
}

function isCustomBind(value: unknown): value is CustomBind {
  if (!value || typeof value !== "object") return false;
  const item = value as CustomBind;
  return typeof item.id === "string" && typeof item.label === "string" && typeof item.key === "string" &&
    typeof item.command === "string" && typeof item.enabled === "boolean";
}

function isImportedConfigFile(value: unknown): value is ImportedConfigFile {
  if (!value || typeof value !== "object") return false;
  const item = value as ImportedConfigFile;
  return typeof item.name === "string" && item.name.length > 0 && item.name.length <= 255 &&
    ["cfg", "vcfg-kv1", "kv3"].includes(item.format) &&
    typeof item.source === "string" && item.source.length <= 100_000;
}
