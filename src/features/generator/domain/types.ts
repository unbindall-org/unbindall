import type { ConfigState } from "../catalog/commands";

export const GENERATOR_SCHEMA_VERSION = 3 as const;

export type ImportedConfigFormat = "cfg" | "vcfg-kv1" | "kv3";

export type ImportedConfigFile = {
  name: string;
  format: ImportedConfigFormat;
  source: string;
};

export const CONFIG_TYPES = [
  "matchmaking",
  "practice",
  "server",
  "offline",
  "warmup",
  "launch-options",
] as const;

export type ConfigType = (typeof CONFIG_TYPES)[number];

export type StandardBind = {
  actionId: string;
  key: string;
  enabled: boolean;
};

export type MultiBind = {
  id: string;
  label: string;
  actionId: string;
  keys: string[];
  enabled: boolean;
};

export type CustomBind = {
  id: string;
  label: string;
  key: string;
  command: string;
  enabled: boolean;
};

export type GeneratorDocument = {
  schemaVersion: typeof GENERATOR_SCHEMA_VERSION;
  configType: ConfigType;
  commandValues: ConfigState;
  standardBinds: StandardBind[];
  multiBinds: MultiBind[];
  customBinds: CustomBind[];
  importedFiles: ImportedConfigFile[];
};

export type BindingSource = "standard" | "multi" | "custom";

export type ResolvedBinding = {
  id: string;
  source: BindingSource;
  label: string;
  key: string;
  command: string;
};
