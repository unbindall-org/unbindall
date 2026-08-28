import type { CommandDefinition } from "./commands";
import type { CatalogLocale, CommandCatalogRecord, CommandCatalogSnapshot } from "./model";

export function localizeCatalog(snapshot: CommandCatalogSnapshot, locale: CatalogLocale): CommandDefinition[] {
  return snapshot.commands
    .filter((command) => command.published)
    .map((command) => localizeCommand(command, locale));
}

export function localizeCommand(command: CommandCatalogRecord, locale: CatalogLocale): CommandDefinition {
  return {
    name: command.name,
    label: command.label[locale],
    description: command.description[locale],
    category: command.category,
    type: command.type,
    defaultValue: command.defaultValue,
    enabledByDefault: command.enabledByDefault,
    min: command.min,
    max: command.max,
    step: command.step,
    unit: command.unit,
    options: command.options.map((option) => ({ value: option.value, label: option.label[locale] })),
    preview: command.preview,
    configTypes: command.configTypes,
    status: command.status,
  };
}

