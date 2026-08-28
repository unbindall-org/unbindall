import { bindActions, categories, commands } from "../catalog/commands";
import type { GeneratorDocument } from "../domain/types";

export type GeneratorModuleId =
  | "mouse" | "crosshair" | "viewmodel" | "radar" | "audio" | "hud" | "performance" | "server" | "practice" | "launch-options"
  | "binds" | "multi-binds" | "custom-binds";

export type GeneratorModule = {
  id: GeneratorModuleId;
  kind: "settings" | "standard-binds" | "multi-binds" | "custom-binds";
  label: string;
  shortLabel: string;
  description: string;
  searchableText: string;
};

const settingsModules: GeneratorModule[] = categories
  .filter((category) => category.id !== "binds")
  .map((category) => ({
    ...category,
    kind: "settings" as const,
    searchableText: commands
      .filter((command) => command.category === category.id)
      .map((command) => `${command.label} ${command.name} ${command.description} ${command.status.verification} ${command.status.restrictions.join(" ")} ${command.status.checkedVersion}`)
      .join(" ")
      .toLowerCase(),
  }));

export const generatorModules: GeneratorModule[] = [
  ...settingsModules,
  {
    id: "binds", kind: "standard-binds", label: "Normale Keybinds", shortLabel: "Keybinds",
    description: "Vollständige Standardbelegung für Bewegung, Kampf und Interface",
    searchableText: `keybinds tasten bewegung kampf waffen granaten kommunikation interface ${bindActions.map((action) => `${action.label} ${action.command}`).join(" ")}`.toLowerCase(),
  },
  {
    id: "multi-binds", kind: "multi-binds", label: "Double-Bind Generator", shortLabel: "Double Binds",
    description: "Eine einzelne Aktion auf zwei oder mehr Tasten legen",
    searchableText: "double mehrfach bind zweite taste maus granate smoke flash he molotov",
  },
  {
    id: "custom-binds", kind: "custom-binds", label: "Custom-Binds", shortLabel: "Custom",
    description: "Eigene einzelne Console-Aktionen sicher an Tasten binden",
    searchableText: "custom eigene freie console commands binds",
  },
];

export function moduleCount(module: GeneratorModule) {
  if (module.kind === "settings") return commands.filter((command) => command.category === module.id).length;
  return null;
}

export function moduleDocumentItemCount(module: GeneratorModule, document: GeneratorDocument, enabledOnly = false) {
  if (module.kind === "settings") {
    return commands.filter((command) => command.category === module.id &&
      (!enabledOnly || Boolean(document.commandValues[`enabled:${command.name}`]))).length;
  }
  if (module.kind === "standard-binds") {
    return document.standardBinds.filter((binding) => !enabledOnly || binding.enabled).length;
  }
  if (module.kind === "multi-binds") {
    return document.multiBinds.filter((binding) => !enabledOnly || binding.enabled).length;
  }
  return document.customBinds.filter((binding) => !enabledOnly || binding.enabled).length;
}
