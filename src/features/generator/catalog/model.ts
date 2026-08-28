import { z } from "zod";

export const categoryIds = [
  "mouse",
  "crosshair",
  "viewmodel",
  "radar",
  "audio",
  "hud",
  "performance",
  "server",
  "practice",
  "launch-options",
] as const;

export const commandControlTypes = ["toggle", "range", "select", "text", "action", "color"] as const;
export const commandVerificationStates = ["verified", "deprecated"] as const;
export const commandRestrictions = ["offline-only", "requires-cheats"] as const;
export const commandPreviews = ["crosshair", "viewmodel", "radar"] as const;
export const catalogConfigTypes = ["matchmaking", "practice", "server", "offline", "warmup", "launch-options"] as const;

export type CategoryId = (typeof categoryIds)[number];
export type CommandControlType = (typeof commandControlTypes)[number];
export type CommandVerification = (typeof commandVerificationStates)[number];
export type CommandRestriction = (typeof commandRestrictions)[number];
export type CommandPreview = (typeof commandPreviews)[number];
export type CatalogConfigType = (typeof catalogConfigTypes)[number];
export type CatalogLocale = "de" | "en";

export type LocalizedText = { de: string; en: string };
export type CatalogCommandOption = { value: string | number; label: LocalizedText };

export type CommandCatalogRecord = {
  id: string;
  name: string;
  category: CategoryId;
  type: CommandControlType;
  label: LocalizedText;
  description: LocalizedText;
  defaultValue: string | number | boolean;
  enabledByDefault: boolean;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  options: CatalogCommandOption[];
  preview?: CommandPreview;
  status: {
    verification: CommandVerification;
    restrictions: CommandRestriction[];
    checkedVersion: string;
  };
  configTypes: CatalogConfigType[];
  sortOrder: number;
  published: boolean;
  revision: number;
  updatedAt: string;
};

export type CommandCatalogSnapshot = {
  version: string;
  commands: CommandCatalogRecord[];
};

const localizedTextSchema = z.object({
  de: z.string().trim().min(1).max(160),
  en: z.string().trim().min(1).max(160),
});

const commandOptionSchema = z.object({
  value: z.union([z.string().max(200), z.number().finite()]),
  label: localizedTextSchema,
});

const optionalFiniteNumber = z.number().finite().optional();

export const commandCatalogInputSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(100).regex(/^[a-zA-Z0-9_+.-]+$/, "Ungültiger Command-Name."),
  category: z.enum(categoryIds),
  type: z.enum(commandControlTypes),
  label: localizedTextSchema,
  description: z.object({
    de: z.string().trim().min(1).max(1_000),
    en: z.string().trim().min(1).max(1_000),
  }),
  defaultValue: z.union([z.string().max(200), z.number().finite(), z.boolean()]),
  enabledByDefault: z.boolean().default(false),
  min: optionalFiniteNumber,
  max: optionalFiniteNumber,
  step: optionalFiniteNumber,
  unit: z.string().trim().max(20).optional(),
  options: z.array(commandOptionSchema).max(100).default([]),
  preview: z.enum(commandPreviews).optional(),
  verification: z.enum(commandVerificationStates),
  restrictions: z.array(z.enum(commandRestrictions)).max(commandRestrictions.length),
  checkedVersion: z.string().trim().min(1).max(120),
  configTypes: z.array(z.enum(catalogConfigTypes)).min(1).max(catalogConfigTypes.length),
  sortOrder: z.number().int().min(0).max(1_000_000),
  published: z.boolean(),
}).superRefine((command, context) => {
  if (new Set(command.restrictions).size !== command.restrictions.length) {
    context.addIssue({ code: "custom", path: ["restrictions"], message: "Einschränkungen müssen eindeutig sein." });
  }
  if (new Set(command.configTypes).size !== command.configTypes.length) {
    context.addIssue({ code: "custom", path: ["configTypes"], message: "Config-Arten müssen eindeutig sein." });
  }
  if (command.type === "range") {
    if (typeof command.defaultValue !== "number" || command.min === undefined || command.max === undefined || command.step === undefined) {
      context.addIssue({ code: "custom", path: ["type"], message: "Ranges benötigen einen Zahlenwert sowie Min, Max und Schrittweite." });
    } else if (command.min > command.max || command.step <= 0 || command.defaultValue < command.min || command.defaultValue > command.max) {
      context.addIssue({ code: "custom", path: ["defaultValue"], message: "Range-Grenzen und Standardwert sind inkonsistent." });
    }
  }
  if (command.type === "toggle" && typeof command.defaultValue !== "boolean") {
    context.addIssue({ code: "custom", path: ["defaultValue"], message: "Toggle-Commands benötigen einen booleschen Standardwert." });
  }
  if (command.type === "text" && typeof command.defaultValue !== "string") {
    context.addIssue({ code: "custom", path: ["defaultValue"], message: "Text-Commands benötigen einen Text-Standardwert." });
  }
  if (command.type === "select") {
    if (!command.options.length || !command.options.some((option) => option.value === command.defaultValue)) {
      context.addIssue({ code: "custom", path: ["options"], message: "Select-Commands benötigen Optionen inklusive Standardwert." });
    }
    const values = command.options.map((option) => `${typeof option.value}:${String(option.value)}`);
    if (new Set(values).size !== values.length) {
      context.addIssue({ code: "custom", path: ["options"], message: "Optionswerte müssen eindeutig sein." });
    }
  }
  if (command.verification === "deprecated" && command.enabledByDefault) {
    context.addIssue({ code: "custom", path: ["enabledByDefault"], message: "Veraltete Commands dürfen nicht standardmäßig aktiv sein." });
  }
});

export type CommandCatalogInput = z.infer<typeof commandCatalogInputSchema>;
