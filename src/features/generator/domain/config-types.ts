import type { CommandDefinition } from "../catalog/commands";
import type { ConfigType } from "./types";

export type ConfigTypeDefinition = {
  id: ConfigType;
  label: string;
  description: string;
  fileName: string;
  outputKind: "cfg" | "launch-options";
};

export const configTypes: ConfigTypeDefinition[] = [
  {
    id: "matchmaking",
    label: "Matchmaking",
    description: "Persönliche Einstellungen und Binds für Competitive-Matches",
    fileName: "autoexec.cfg",
    outputKind: "cfg",
  },
  {
    id: "practice",
    label: "Practice",
    description: "Granaten-Lineups, Flugbahnen, Einschläge und freie Bewegung",
    fileName: "practice.cfg",
    outputKind: "cfg",
  },
  {
    id: "server",
    label: "Server",
    description: "Matchformat, Economy, Teams und Admin-Regeln",
    fileName: "server.cfg",
    outputKind: "cfg",
  },
  {
    id: "offline",
    label: "Offline",
    description: "Lokale Matches mit Bots und eigenen Rundenregeln",
    fileName: "offline.cfg",
    outputKind: "cfg",
  },
  {
    id: "warmup",
    label: "Warmup",
    description: "Dauer, Timer und Ablauf der Aufwärmphase",
    fileName: "warmup.cfg",
    outputKind: "cfg",
  },
  {
    id: "launch-options",
    label: "Launch Options",
    description: "Startparameter für die Steam-Eigenschaften von CS2",
    fileName: "launch-options.txt",
    outputKind: "launch-options",
  },
];

const clientCategories = new Set([
  "mouse", "crosshair", "viewmodel", "radar", "audio", "hud", "performance",
]);

const practiceServerCommands = new Set([
  "mp_buytime", "mp_freezetime", "mp_roundtime_defuse", "mp_restartgame",
]);

const warmupCommands = new Set([
  "mp_warmuptime", "mp_warmup_pausetimer", "mp_warmup_end",
]);

const offlineServerCommands = new Set([
  "mp_autoteambalance", "mp_limitteams", "mp_friendlyfire", "mp_freezetime",
  "mp_roundtime", "mp_roundtime_defuse", "mp_maxrounds", "mp_startmoney",
  "mp_maxmoney", "mp_buytime", "mp_c4timer", "mp_restartgame",
]);

export function getConfigTypeDefinition(type: ConfigType) {
  return configTypes.find((definition) => definition.id === type) ?? configTypes[0];
}

export function isCommandAvailable(type: ConfigType, command: CommandDefinition) {
  if (command.configTypes) return command.configTypes.includes(type);
  if (type === "matchmaking") return clientCategories.has(command.category);
  if (type === "practice") return command.category === "practice" || practiceServerCommands.has(command.name);
  if (type === "server") return command.category === "server";
  if (type === "offline") return command.category === "practice" || offlineServerCommands.has(command.name);
  if (type === "warmup") return warmupCommands.has(command.name);
  return command.category === "launch-options";
}

export function configTypeUsesBinds(type: ConfigType) {
  return type === "matchmaking";
}

export function defaultConfigName(type: ConfigType) {
  const definition = getConfigTypeDefinition(type);
  return type === "matchmaking" ? "Meine Matchmaking Config" : `Meine ${definition.label} Config`;
}

export function presetsForConfigType(type: ConfigType) {
  if (type === "matchmaking") return new Set(["competitive", "minimal", "accessible"]);
  if (type === "server") return new Set(["server-competitive"]);
  if (type === "practice" || type === "offline") return new Set(["practice"]);
  return new Set<string>();
}
