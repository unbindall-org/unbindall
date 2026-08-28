import { z } from "zod";
import { CONFIG_TYPES, GENERATOR_SCHEMA_VERSION } from "./types";

const commandValueSchema = z.union([z.string().max(500), z.number().finite(), z.boolean()]);
const keySchema = z.string().max(24);

export const generatorDocumentSchema = z.object({
  schemaVersion: z.literal(GENERATOR_SCHEMA_VERSION),
  configType: z.enum(CONFIG_TYPES),
  commandValues: z.record(z.string().max(100), commandValueSchema),
  standardBinds: z.array(z.object({
    actionId: z.string().max(50),
    key: keySchema,
    enabled: z.boolean(),
  })).max(100),
  multiBinds: z.array(z.object({
    id: z.string().max(100),
    label: z.string().max(50),
    actionId: z.string().max(50),
    keys: z.array(keySchema).min(2).max(4),
    enabled: z.boolean(),
  })).max(50),
  customBinds: z.array(z.object({
    id: z.string().max(100),
    label: z.string().max(50),
    key: keySchema,
    command: z.string().max(160),
    enabled: z.boolean(),
  })).max(100),
  importedFiles: z.array(z.object({
    name: z.string().min(1).max(255),
    format: z.enum(["cfg", "vcfg-kv1", "kv3"]),
    source: z.string().max(100_000),
  })).max(10),
});
