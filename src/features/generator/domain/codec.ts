import { categories, commands } from "../catalog/commands";
import { normalizeDocument } from "./document";
import { resolveBindings } from "./bindings";
import type { GeneratorDocument } from "./types";
import { configTypeUsesBinds, getConfigTypeDefinition, isCommandAvailable } from "./config-types";
import { importConfigFiles, renderImportedFiles, type ConfigImportInput } from "./config-import";

export function serializeConfig(document: GeneratorDocument, locale: "de" | "en" = "de") {
  if (document.configType === "launch-options") return serializeLaunchOptions(document);
  const definition = getConfigTypeDefinition(document.configType);

  const sectionLabels: Partial<Record<(typeof categories)[number]["id"], string>> = locale === "en" ? {
    mouse: "Mouse & Aim", crosshair: "Crosshair", viewmodel: "Viewmodel", radar: "Radar",
    audio: "Audio", hud: "HUD & Gameplay", performance: "Performance", server: "Competitive server",
    practice: "Practice",
  } : {};
  const sections = categories
    .filter((category) => category.id !== "binds")
    .map((category) => {
      const lines = commands
        .filter((command) => command.category === category.id && isCommandAvailable(document.configType, command) && command.status.verification !== "deprecated" && document.commandValues[`enabled:${command.name}`])
        .map((command) => command.type === "action"
          ? command.name
          : `${command.name} ${formatValue(document.commandValues[command.name])}`);
      return lines.length ? `// ${sectionLabels[category.id] ?? category.label}\n${lines.join("\n")}` : "";
    })
    .filter(Boolean);

  const bindings = configTypeUsesBinds(document.configType) ? resolveBindings(document) : [];
  const bindSections = [
    [locale === "en" ? "Standard keybinds" : "Normale Keybinds", bindings.filter((binding) => binding.source === "standard")],
    [locale === "en" ? "Multi-binds" : "Double- und Mehrfachbinds", bindings.filter((binding) => binding.source === "multi")],
    [locale === "en" ? "Custom binds" : "Custom-Binds", bindings.filter((binding) => binding.source === "custom")],
  ] as const;

  for (const [label, items] of bindSections) {
    const unique = new Map(items.map((binding) => [`${binding.key}\0${binding.command}`, binding]));
    if (unique.size) {
      sections.push(`// ${label}\n${[...unique.values()].map((binding) => bindLine(binding.key, binding.command)).join("\n")}`);
    }
  }

  const importedSections = renderImportedFiles(document.importedFiles);

  return [
    `// UNBINDALL — CS2 ${definition.label.toUpperCase()} CONFIG`,
    `// Schema v${document.schemaVersion} · ${locale === "en" ? "Generated on" : "Generiert am"} ${new Intl.DateTimeFormat(locale === "en" ? "en-US" : "de-DE", { dateStyle: "medium" }).format(new Date())}`,
    "",
    ...importedSections.flatMap((section) => [section, ""]),
    ...sections.flatMap((section) => [section, ""]),
    locale === "en" ? `echo "[Unbindall] ${definition.fileName} loaded"` : `echo "[Unbindall] ${definition.fileName} geladen"`,
    "",
  ].join("\n");
}

export function parseConfig(source: string, current: GeneratorDocument) {
  const next = normalizeDocument(current);
  if (next.configType === "launch-options") return parseLaunchOptions(source, next);
  return importConfigFiles([{ name: "import.cfg", source }], next);
}

export function parseConfigFiles(files: ConfigImportInput[], current: GeneratorDocument) {
  const next = normalizeDocument(current);
  if (next.configType === "launch-options") {
    return files.reduce((document, file) => parseLaunchOptions(file.source, document), next);
  }
  return importConfigFiles(files, next);
}

function serializeLaunchOptions(document: GeneratorDocument) {
  const values = document.commandValues;
  const options: string[] = [];
  if (values["enabled:launch_console"] && values.launch_console) options.push("-console");
  if (values["enabled:launch_display_mode"]) {
    if (values.launch_display_mode === "fullscreen") options.push("-fullscreen");
    if (values.launch_display_mode === "windowed") options.push("-windowed");
  }
  if (values["enabled:launch_width"]) options.push("-w", String(Math.round(Number(values.launch_width))));
  if (values["enabled:launch_height"]) options.push("-h", String(Math.round(Number(values.launch_height))));
  if (values["enabled:launch_safe"] && values.launch_safe) options.push("-safe");
  if (values["enabled:launch_autoconfig"] && values.launch_autoconfig) options.push("-autoconfig");
  if (values["enabled:launch_extra"] && values.launch_extra) {
    options.push(String(values.launch_extra).replace(/[\r\n]/g, " ").trim());
  }
  return options.filter(Boolean).join(" ");
}

function parseLaunchOptions(source: string, document: GeneratorDocument) {
  const flags = source.replace(/[\r\n]/g, " ").trim().split(/\s+/).filter(Boolean);
  const known = new Set<string>();
  const enable = (name: string, value: string | number | boolean) => {
    document.commandValues[name] = value;
    document.commandValues[`enabled:${name}`] = true;
  };
  if (flags.includes("-console")) { enable("launch_console", true); known.add("-console"); }
  if (flags.includes("-fullscreen")) { enable("launch_display_mode", "fullscreen"); known.add("-fullscreen"); }
  if (flags.includes("-windowed")) { enable("launch_display_mode", "windowed"); known.add("-windowed"); }
  if (flags.includes("-safe")) { enable("launch_safe", true); known.add("-safe"); }
  if (flags.includes("-autoconfig")) { enable("launch_autoconfig", true); known.add("-autoconfig"); }
  for (const [flag, name] of [["-w", "launch_width"], ["-h", "launch_height"]] as const) {
    const index = flags.indexOf(flag);
    const value = index >= 0 ? Number(flags[index + 1]) : NaN;
    if (Number.isFinite(value)) {
      enable(name, value);
      known.add(flag);
      known.add(flags[index + 1]);
    }
  }
  const extra = flags.filter((flag) => !known.has(flag)).join(" ");
  if (extra) enable("launch_extra", extra);
  return document;
}

function bindLine(key: string, command: string) {
  return `bind "${escapeCfg(key)}" "${escapeCfg(command)}"`;
}

function formatValue(value: GeneratorDocument["commandValues"][string]) {
  if (typeof value === "boolean") return value ? "1" : "0";
  if (typeof value === "number") return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(4)));
  return `"${escapeCfg(value ?? "")}"`;
}

function escapeCfg(value: string) {
  return value.replaceAll("\\", "\\\\").replaceAll('"', '\\"').replaceAll("\n", "").replaceAll("\r", "");
}
