import { bindActions, commands, isCommandEditable } from "../catalog/commands";
import { normalizeDocument } from "./document";
import { sanitizeKey, validateCustomCommand } from "./bindings";
import type { GeneratorDocument, ImportedConfigFile, ImportedConfigFormat, MultiBind } from "./types";

export type ConfigImportInput = { name: string; source: string };

type ParsedBinding = { key: string; command: string };
type KvObject = Array<[string, KvValue]>;
type KvValue = string | KvObject | KvValue[];
type KvToken = { type: "value" | "symbol"; value: string };

export function importConfigFiles(inputs: ConfigImportInput[], current: GeneratorDocument) {
  const next = normalizeDocument(current);
  const files = inputs
    .filter((input) => input.source.length > 0)
    .map<ImportedConfigFile>((input) => ({
      name: sanitizeFileName(input.name),
      format: detectConfigFormat(input.name, input.source),
      source: input.source,
    }));

  next.importedFiles = [...next.importedFiles, ...files].slice(-10);

  const parsedBinds: ParsedBinding[] = [];
  for (const file of files) {
    const cfgSource = file.format === "cfg" ? file.source : convertKeyValuesToCfg(file.source);
    importCfgSemantics(cfgSource, next, parsedBinds);
  }
  importBindings(parsedBinds, next);
  return next;
}

export function detectConfigFormat(name: string, source: string): ImportedConfigFormat {
  const lowerName = name.toLowerCase();
  const trimmed = source.trimStart();
  if (lowerName.endsWith(".kv3") || trimmed.startsWith("<!-- kv3")) return "kv3";
  if (lowerName.endsWith(".vcfg") || /^"?config"?\s*\{/i.test(trimmed)) return "vcfg-kv1";
  return "cfg";
}

export function convertKeyValuesToCfg(source: string) {
  const root = parseKeyValues(source);
  if (!root) return "";
  const convars = findKvObject(root, "convars");
  const bindings = findKvObject(root, "bindings");
  const lines: string[] = [];

  if (convars) {
    for (const [name, value] of convars) {
      if (typeof value !== "string" || /[\s;"\\]/.test(name)) continue;
      lines.push(`${name} "${escapeCfg(value)}"`);
    }
  }
  if (bindings) {
    for (const [key, value] of bindings) {
      if (typeof value !== "string") continue;
      lines.push(`bind "${escapeCfg(key)}" "${escapeCfg(value)}"`);
    }
  }
  return lines.join("\n");
}

export function renderImportedFiles(files: ImportedConfigFile[]) {
  return files.map((file) => {
    const heading = `// ── Importquelle: ${file.name} ──`;
    if (file.format === "cfg") return `${heading}\n${file.source.replace(/\s+$/, "")}`;

    const converted = convertKeyValuesToCfg(file.source);
    const original = file.source.split(/\r\n?|\n/).map((line) => `// ${line}`).join("\n");
    return [
      heading,
      "// Aus VCFG/KV3 in ausführbare CFG-Zeilen übersetzt.",
      converted,
      "",
      "// Originalquelle (verlustfrei als Kommentar erhalten):",
      original,
    ].filter((part, index, parts) => part || (index > 0 && parts[index - 1])).join("\n").replace(/\s+$/, "");
  }).filter(Boolean);
}

function importCfgSemantics(source: string, document: GeneratorDocument, parsedBinds: ParsedBinding[]) {
  const knownCommands = new Map(commands.filter(isCommandEditable).map((command) => [command.name.toLowerCase(), command]));

  for (const statement of cfgStatements(source)) {
    const tokens = cfgTokens(statement);
    if (!tokens.length) continue;
    const commandName = tokens[0].toLowerCase();

    if (commandName === "bind" && tokens.length >= 3) {
      const key = sanitizeKey(tokens[1]);
      const command = tokens.slice(2).join(" ").trim();
      if (key && command) parsedBinds.push({ key, command });
      continue;
    }

    const definition = knownCommands.get(commandName);
    if (!definition) continue;
    if (definition.type === "action" && tokens.length === 1) {
      document.commandValues[`enabled:${definition.name}`] = true;
      continue;
    }
    if (tokens.length < 2) continue;

    const rawValue = tokens.slice(1).join(" ");
    const value = definition.type === "toggle"
      ? rawValue === "1" || rawValue.toLowerCase() === "true"
      : definition.type === "text" ? rawValue : Number(rawValue);
    if (typeof value === "number" && !Number.isFinite(value)) continue;
    document.commandValues[definition.name] = value;
    document.commandValues[`enabled:${definition.name}`] = true;
  }
}

function importBindings(parsedBinds: ParsedBinding[], document: GeneratorDocument) {
  const actionByCommand = new Map(bindActions.map((action) => [action.command.toLowerCase(), action]));
  const bindsByCommand = new Map<string, ParsedBinding[]>();
  for (const binding of parsedBinds) {
    const id = binding.command.toLowerCase();
    const existing = bindsByCommand.get(id) ?? [];
    if (!existing.some((item) => item.key === binding.key)) existing.push(binding);
    bindsByCommand.set(id, existing);
  }

  for (const [commandId, bindings] of bindsByCommand) {
    const action = actionByCommand.get(commandId);
    if (action && bindings.length === 1) {
      document.standardBinds = document.standardBinds.map((binding) => binding.actionId === action.id
        ? { ...binding, key: bindings[0].key, enabled: true }
        : binding);
      continue;
    }
    if (action) {
      document.standardBinds = document.standardBinds.map((binding) => binding.actionId === action.id
        ? { ...binding, enabled: false }
        : binding);
      for (let index = 0; index < bindings.length; index += 4) {
        const group = bindings.slice(index, index + 4);
        if (group.length === 1) {
          addCustomBinding(group[0], document);
          continue;
        }
        const imported: MultiBind = {
          id: createImportId("multi"),
          label: `${action.label} (Import)`,
          actionId: action.id,
          keys: group.map((binding) => binding.key),
          enabled: true,
        };
        document.multiBinds.push(imported);
      }
      continue;
    }
    for (const binding of bindings) addCustomBinding(binding, document);
  }
}

function addCustomBinding(binding: ParsedBinding, document: GeneratorDocument) {
  if (validateCustomCommand(binding.command)) return;
  document.customBinds.push({
    id: createImportId("custom"),
    label: "Importierter Bind",
    key: binding.key,
    command: binding.command,
    enabled: true,
  });
}

function cfgStatements(source: string) {
  const statements: string[] = [];
  let current = "";
  let quoted = false;
  let escaped = false;
  let lineComment = false;

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1];
    if (lineComment) {
      if (char === "\n") {
        lineComment = false;
        if (current.trim()) statements.push(current.trim());
        current = "";
      }
      continue;
    }
    if (!quoted && char === "/" && next === "/") {
      lineComment = true;
      index += 1;
      continue;
    }
    if (char === '"' && !escaped) quoted = !quoted;
    if (!quoted && (char === "\n" || char === ";")) {
      if (current.trim()) statements.push(current.trim());
      current = "";
      escaped = false;
      continue;
    }
    if (char !== "\r") current += char;
    escaped = char === "\\" && !escaped;
    if (char !== "\\") escaped = false;
  }
  if (current.trim()) statements.push(current.trim());
  return statements;
}

function cfgTokens(statement: string) {
  const tokens: string[] = [];
  let current = "";
  let quoted = false;
  let escaped = false;
  for (const char of statement) {
    if (escaped) {
      current += char;
      escaped = false;
      continue;
    }
    if (char === "\\" && quoted) {
      escaped = true;
      continue;
    }
    if (char === '"') {
      quoted = !quoted;
      continue;
    }
    if (!quoted && /\s/.test(char)) {
      if (current) tokens.push(current);
      current = "";
      continue;
    }
    current += char;
  }
  if (escaped) current += "\\";
  if (current) tokens.push(current);
  return tokens;
}

function parseKeyValues(source: string): KvObject | null {
  const tokens = tokenizeKeyValues(source);
  if (!tokens.length) return null;
  let index = 0;

  const parseValue = (): KvValue => {
    const token = tokens[index];
    if (!token) return "";
    if (token.value === "{") return parseObject();
    if (token.value === "[") {
      index += 1;
      const values: KvValue[] = [];
      while (index < tokens.length && tokens[index].value !== "]") {
        if (tokens[index].value === ",") { index += 1; continue; }
        values.push(parseValue());
      }
      if (tokens[index]?.value === "]") index += 1;
      return values;
    }
    index += 1;
    return token.value;
  };

  const parseObject = (): KvObject => {
    if (tokens[index]?.value === "{") index += 1;
    const entries: KvObject = [];
    while (index < tokens.length && tokens[index].value !== "}") {
      if (tokens[index].type === "symbol") { index += 1; continue; }
      const key = tokens[index].value;
      index += 1;
      if (tokens[index]?.value === "=") index += 1;
      entries.push([key, parseValue()]);
      if (tokens[index]?.value === ",") index += 1;
    }
    if (tokens[index]?.value === "}") index += 1;
    return entries;
  };

  if (tokens[0].value === "{") return parseObject();
  return parseObject();
}

function tokenizeKeyValues(source: string) {
  const tokens: KvToken[] = [];
  let index = 0;
  while (index < source.length) {
    const char = source[index];
    if (/\s/.test(char)) { index += 1; continue; }
    if (char === "/" && source[index + 1] === "/") {
      index = source.indexOf("\n", index + 2);
      if (index < 0) break;
      continue;
    }
    if (char === "/" && source[index + 1] === "*") {
      const end = source.indexOf("*/", index + 2);
      index = end < 0 ? source.length : end + 2;
      continue;
    }
    if (char === "<" && source[index + 1] === "!") {
      const end = source.indexOf("-->", index + 2);
      index = end < 0 ? source.length : end + 3;
      continue;
    }
    if ('{}[]=,'.includes(char)) {
      tokens.push({ type: "symbol", value: char });
      index += 1;
      continue;
    }
    if (char === '"') {
      let value = "";
      index += 1;
      while (index < source.length) {
        const item = source[index];
        if (item === "\\" && index + 1 < source.length) {
          const escaped = source[index + 1];
          value += escaped === "n" ? "\n" : escaped === "t" ? "\t" : escaped;
          index += 2;
          continue;
        }
        if (item === '"') { index += 1; break; }
        value += item;
        index += 1;
      }
      tokens.push({ type: "value", value });
      continue;
    }
    let value = "";
    while (index < source.length && !/\s/.test(source[index]) && !'{}[]=,'.includes(source[index])) {
      value += source[index];
      index += 1;
    }
    if (value) tokens.push({ type: "value", value });
  }
  return tokens;
}

function findKvObject(root: KvObject, key: string): KvObject | null {
  for (const [name, value] of root) {
    if (name.toLowerCase() === key && isKvObject(value)) return value;
    if (isKvObject(value)) {
      const nested = findKvObject(value, key);
      if (nested) return nested;
    }
  }
  return null;
}

function isKvObject(value: KvValue): value is KvObject {
  return Array.isArray(value) && value.every((item) => Array.isArray(item) && item.length === 2 && typeof item[0] === "string");
}

function createImportId(prefix: string) {
  return `${prefix}-import-${globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)}`;
}

function sanitizeFileName(name: string) {
  return name.replace(/[\r\n]/g, " ").trim().slice(0, 255) || "import.cfg";
}

function escapeCfg(value: string) {
  return value.replaceAll("\\", "\\\\").replaceAll('"', '\\"').replaceAll("\n", "").replaceAll("\r", "");
}
