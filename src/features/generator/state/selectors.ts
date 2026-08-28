import { configTypeUsesBinds, getConfigTypeDefinition, isCommandAvailable } from "../domain/config-types";
import { resolveBindings } from "../domain/bindings";
import { serializeConfig } from "../domain/codec";
import { commands, isCommandEditable } from "../catalog/commands";
import type { GeneratorEditorStore } from "./editor-store";

export const selectDocument = (state: GeneratorEditorStore) => state.document;
export const selectName = (state: GeneratorEditorStore) => state.name;
export const selectOrigin = (state: GeneratorEditorStore) => state.origin;
export const selectSync = (state: GeneratorEditorStore) => state.sync;
export const selectHydration = (state: GeneratorEditorStore) => state.hydration;
export const selectQuery = (state: GeneratorEditorStore) => state.query;
export const selectActiveCategory = (state: GeneratorEditorStore) => state.activeCategory;
export const selectConfigPanelOpen = (state: GeneratorEditorStore) => state.configPanelOpen;

export const selectCurrentId = (state: GeneratorEditorStore) =>
  state.origin.type === "cloud" ? state.origin.configId : null;

export const selectCurrentRevision = (state: GeneratorEditorStore) =>
  state.origin.type === "cloud" ? state.origin.revision : 0;

export function selectRawConfig(state: GeneratorEditorStore, locale: "de" | "en") {
  return serializeConfig(state.document, locale);
}

export function selectEnabledCount(state: GeneratorEditorStore) {
  const document = state.document;
  return commands.filter((command) =>
    isCommandEditable(command) && isCommandAvailable(document.configType, command) && document.commandValues[`enabled:${command.name}`]).length +
    (configTypeUsesBinds(document.configType) ? resolveBindings(document).length : 0);
}

export function selectLineCount(state: GeneratorEditorStore, locale: "de" | "en") {
  const source = selectRawConfig(state, locale);
  return source ? source.split("\n").length : 0;
}

export const selectConfigDefinition = (state: GeneratorEditorStore) =>
  getConfigTypeDefinition(state.document.configType);

export function selectSyncStatus(state: GeneratorEditorStore) {
  return state.sync.status;
}

export function selectCanAutosave(state: GeneratorEditorStore) {
  return state.hydration === "ready" &&
    state.origin.type === "cloud" &&
    state.origin.validated &&
    ["dirty", "offline"].includes(state.sync.status);
}
