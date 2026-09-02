import { bindActions } from "../catalog/commands";
import type { GeneratorDocument, ResolvedBinding } from "./types";

type BindingDocument = Pick<GeneratorDocument, "standardBinds" | "multiBinds" | "customBinds">;

const forbiddenCommands = new Set([
  "alias", "bind", "binddefaults", "disconnect", "exec", "exit", "host_writeconfig",
  "quit", "restart", "sv_cheats", "unbind", "unbindall",
]);

export const keySuggestions = [
  "mouse1", "mouse2", "mouse3", "mouse4", "mouse5", "mwheelup", "mwheeldown",
  "space", "shift", "ctrl", "alt", "tab", "capslock", "enter", "backspace",
  "a", "b", "c", "d", "e", "f", "g", "h", "q", "r", "t", "v", "x", "z",
  "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "f1", "f2", "f3", "f4",
];

export function sanitizeKey(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9_+\-`']/g, "").slice(0, 24);
}

export function validateCustomCommand(value: string) {
  const command = value.trim();
  if (!command) return "Command fehlt";
  if (command.length > 160) return "Command ist zu lang";
  if (/[;\n\r]/.test(command)) return "Nur eine Aktion pro Bind erlaubt";
  if (/["\\]/.test(command)) return "Anführungszeichen und Backslashes sind nicht erlaubt";
  const root = command.split(/\s+/)[0].toLowerCase();
  if (forbiddenCommands.has(root)) return "Dieser Command ist für Custom-Binds gesperrt";
  return null;
}

export function resolveBindings(document: BindingDocument): ResolvedBinding[] {
  const actions = new Map(bindActions.map((action) => [action.id, action]));
  const resolved: ResolvedBinding[] = [];

  for (const binding of document.standardBinds) {
    const action = actions.get(binding.actionId as (typeof bindActions)[number]["id"]);
    const key = sanitizeKey(binding.key);
    if (binding.enabled && action && key) {
      resolved.push({ id: `standard:${binding.actionId}`, source: "standard", label: action.label, key, command: action.command });
    }
  }

  for (const binding of document.multiBinds) {
    const action = actions.get(binding.actionId as (typeof bindActions)[number]["id"]);
    if (!binding.enabled || !action) continue;
    for (const [index, rawKey] of binding.keys.entries()) {
      const key = sanitizeKey(rawKey);
      if (key) resolved.push({ id: `${binding.id}:${index}`, source: "multi", label: binding.label, key, command: action.command });
    }
  }

  for (const binding of document.customBinds) {
    const key = sanitizeKey(binding.key);
    if (binding.enabled && key && !validateCustomCommand(binding.command)) {
      resolved.push({ id: binding.id, source: "custom", label: binding.label, key, command: binding.command.trim() });
    }
  }

  return resolved;
}

export function findBindingConflicts(document: BindingDocument) {
  const byKey = new Map<string, ResolvedBinding[]>();
  for (const binding of resolveBindings(document)) {
    byKey.set(binding.key, [...(byKey.get(binding.key) ?? []), binding]);
  }
  return new Map([...byKey].filter(([, bindings]) => new Set(bindings.map((item) => item.command)).size > 1));
}
