"use client";

import { useDeferredValue, useMemo, useRef, type RefObject } from "react";
import { BookmarkPlus, Import, Lock, RotateCcw, Search, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { configTypeIcons } from "@/features/shell/components/config-type-icons";
import type { CommandDefinition } from "../catalog/commands";
import { resolveBindings } from "../domain/bindings";
import type { GeneratorDocument } from "../domain/types";
import { getConfigTypeDefinition, isCommandAvailable } from "../domain/config-types";
import type { GeneratorModule } from "../modules/registry";
import { CustomBindsModule, MultiBindsModule, StandardBindsModule } from "./bind-modules";
import { CommandControl } from "./command-control";
import { ConfigOutline, type OutlineEntry } from "./config-outline";
import { generatorModuleIcons } from "./module-icons";
import { CrosshairPreview, RadarPreview, ViewmodelPreview } from "./previews";

type Props = {
  document: GeneratorDocument;
  configName: string;
  query: string;
  showAllCommands: boolean;
  commands: CommandDefinition[];
  modules: GeneratorModule[];
  importRef: RefObject<HTMLInputElement | null>;
  searchRef: RefObject<HTMLInputElement | null>;
  onQueryChange(query: string): void;
  onShowAllCommandsChange(showAll: boolean): void;
  onNameChange(name: string): void;
  onCommandChange(name: string, value: string | number | boolean): void;
  onDocumentChange(document: GeneratorDocument): void;
  onReset(): void;
  onCreateCheckpoint(): void;
  canCheckpoint: boolean;
};

export function GeneratorWorkspace({
  document,
  configName,
  query,
  showAllCommands,
  commands,
  modules,
  importRef,
  searchRef,
  onQueryChange,
  onShowAllCommandsChange,
  onNameChange,
  onCommandChange,
  onDocumentChange,
  onReset,
  onCreateCheckpoint,
  canCheckpoint,
}: Props) {
  const { t } = useTranslation();
  const scrollRef = useRef<HTMLDivElement>(null);
  const deferredQuery = useDeferredValue(query);
  const normalizedQuery = deferredQuery.trim().toLowerCase();
  const activeOnly = !showAllCommands;
  const definition = getConfigTypeDefinition(document.configType);
  const TypeIcon = configTypeIcons[document.configType];
  const enabledSignature = commands
    .map((command) => document.commandValues[`enabled:${command.name}`] ? "1" : "0")
    .join("");
  const enabledCommands = useMemo(() => new Set(commands
    .filter((_, index) => enabledSignature[index] === "1")
    .map((command) => command.name)), [commands, enabledSignature]);
  const resolvedBindings = useMemo(() => resolveBindings({
    standardBinds: document.standardBinds,
    multiBinds: document.multiBinds,
    customBinds: document.customBinds,
  }), [document.customBinds, document.multiBinds, document.standardBinds]);

  const { activeCount, commandsByModule, outlineEntries, visibleModules } = useMemo(() => {
    const commandMatches = (command: CommandDefinition) =>
      `${command.label} ${command.name} ${command.description} ${command.status.verification} ${command.status.restrictions.join(" ")} ${command.status.checkedVersion}`
        .toLowerCase()
        .includes(normalizedQuery);
    const commandsByModule = new Map<GeneratorModule["id"], CommandDefinition[]>();

    for (const generatorModule of modules) {
      if (generatorModule.kind !== "settings") continue;
      commandsByModule.set(generatorModule.id, commands.filter((command) =>
        command.category === generatorModule.id &&
        isCommandAvailable(document.configType, command) &&
        (!activeOnly || enabledCommands.has(command.name)) &&
        (!normalizedQuery || commandMatches(command))));
    }

    const itemCount = (module: GeneratorModule, enabledOnly: boolean) => {
      if (module.kind === "settings") {
        return commands.filter((command) => command.category === module.id &&
          isCommandAvailable(document.configType, command) &&
          (!enabledOnly || enabledCommands.has(command.name))).length;
      }
      if (module.kind === "standard-binds") {
        return document.standardBinds.filter((binding) => !enabledOnly || binding.enabled).length;
      }
      if (module.kind === "multi-binds") {
        return document.multiBinds.filter((binding) => !enabledOnly || binding.enabled).length;
      }
      return document.customBinds.filter((binding) => !enabledOnly || binding.enabled).length;
    };

    const moduleHasItemMatch = (module: GeneratorModule) => {
      if (module.kind === "standard-binds") return resolvedBindings.some((binding) =>
        binding.source === "standard" && `${binding.label} ${t(binding.label)} ${binding.command} ${binding.key}`.toLowerCase().includes(normalizedQuery));
      if (module.kind === "multi-binds") return document.multiBinds.some((binding) =>
        (!activeOnly || binding.enabled) && `${binding.label} ${t(binding.label)} ${binding.keys.join(" ")}`.toLowerCase().includes(normalizedQuery));
      if (module.kind === "custom-binds") return document.customBinds.some((binding) =>
        (!activeOnly || binding.enabled) && `${binding.label} ${t(binding.label)} ${binding.command} ${binding.key}`.toLowerCase().includes(normalizedQuery));
      return false;
    };

    const visibleModules = modules.filter((module) => {
      if (activeOnly && itemCount(module, true) === 0) return false;
      if (!normalizedQuery) return true;
      if (module.kind === "settings") return (commandsByModule.get(module.id)?.length ?? 0) > 0;
      const moduleText = activeOnly
        ? `${module.label} ${module.shortLabel} ${module.description}`.toLowerCase()
        : module.searchableText;
      return moduleText.includes(normalizedQuery) || moduleHasItemMatch(module);
    });
    const outlineEntries: OutlineEntry[] = visibleModules.map((module) => ({
      module,
      count: module.kind === "settings"
        ? (commandsByModule.get(module.id)?.length ?? 0)
        : itemCount(module, activeOnly),
    }));

    return {
      activeCount: modules.filter((module) => itemCount(module, true) > 0).length,
      commandsByModule,
      outlineEntries,
      visibleModules,
    };
  }, [activeOnly, commands, document, enabledCommands, modules, normalizedQuery, resolvedBindings, t]);

  return (
    <div className="editor">
      <div className="editor-content">
        <div className="content-toolbar">
          <header className="content-header">
            <div className="search-wrap">
              <Search size={17} />
              <Input ref={searchRef} value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder={t("Command oder Einstellung suchen … z. B. radar, sensitivity, fps_max")} />
              {query
                ? <Button variant="ghost" size="icon-xs" className="search-clear" onClick={() => onQueryChange("")} aria-label={t("Suche löschen")}><X size={15} /></Button>
                : <kbd>⌘K</kbd>}
            </div>
            <Label className="scope-checkbox" htmlFor="show-all-commands">
              <Checkbox
                id="show-all-commands"
                checked={showAllCommands}
                onCheckedChange={(checked) => onShowAllCommandsChange(checked === true)}
              />
              {t("Alle Commands anzeigen")}
            </Label>
            <div className="toolbar-actions">
              {canCheckpoint && <Tooltip>
                <TooltipTrigger asChild><Button variant="outline" size="icon" className="icon-button" aria-label={t("Speicherpunkt anlegen")} onClick={onCreateCheckpoint}><BookmarkPlus size={16} /></Button></TooltipTrigger>
                <TooltipContent>{t("Benannten Speicherpunkt im Versionsverlauf anlegen")}</TooltipContent>
              </Tooltip>}
              <Tooltip>
                <TooltipTrigger asChild><Button variant="outline" size="icon" className="icon-button" aria-label={t("Config importieren")} onClick={() => importRef.current?.click()}><Import size={16} /></Button></TooltipTrigger>
                <TooltipContent>{t(definition.outputKind === "launch-options" ? "Bestehende Launch Options einlesen" : "CFG-, VCFG- oder KV3-Dateien einlesen")}</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild><Button variant="outline" size="icon" className="icon-button" aria-label={t("Auf Standard zurücksetzen")} onClick={onReset}><RotateCcw size={16} /></Button></TooltipTrigger>
                <TooltipContent>{t("Auf Standard zurücksetzen")}</TooltipContent>
              </Tooltip>
            </div>
          </header>
        </div>

        <div className="workspace" ref={scrollRef}>
          <div className="workspace-inner">
            <header className="page-head">
              <div className="config-identity">
                <span className="config-identity-icon"><TypeIcon size={18} /></span>
                <input
                  className="config-name-input"
                  value={configName}
                  maxLength={60}
                  aria-label={t("Config-Name")}
                  onChange={(event) => onNameChange(event.target.value)}
                />
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="config-type-badge"><Lock size={11} />{t(definition.label)}</span>
                  </TooltipTrigger>
                  <TooltipContent>{t("Die Config-Art wird beim Anlegen festgelegt und bleibt fest.")}</TooltipContent>
                </Tooltip>
              </div>
              <p className="page-lead">{t(definition.description)}</p>
            </header>

            <div className="settings-flow">
              {visibleModules.map((module) => {
              const Icon = generatorModuleIcons[module.id];
              const categoryCommands = commandsByModule.get(module.id) ?? [];
              const itemCount = module.kind === "settings"
                ? categoryCommands.length
                : outlineEntries.find((entry) => entry.module.id === module.id)?.count ?? 0;
              return (
                <section className="settings-section" key={module.id} id={`section-${module.id}`}>
                  <div className="section-heading">
                    <span className="section-icon"><Icon size={17} /></span>
                    <div className="section-title"><h2>{module.label}</h2><p>{module.description}</p></div>
                    <span className="section-count">{itemCount}</span>
                  </div>

                  {module.id === "crosshair" && !normalizedQuery && <div className="inline-preview"><CrosshairPreview state={document.commandValues} /><div className="preview-copy"><p className="eyebrow">{t("LIVE PREVIEW")}</p><h3>{t("Sieh jede Änderung direkt.")}</h3><p>{t("Größe, Abstand, Farbe, Punkt und Kontur reagieren ohne Verzögerung.")}</p></div></div>}
                  {module.id === "viewmodel" && !normalizedQuery && <div className="inline-preview reverse"><div className="preview-copy"><p className="eyebrow">VIEWMODEL</p><h3>{t("Mehr Sicht auf das Wesentliche.")}</h3><p>{t("Position und FOV werden als räumliche Vorschau angenähert.")}</p></div><ViewmodelPreview state={document.commandValues} /></div>}
                  {module.id === "radar" && !normalizedQuery && <div className="inline-preview"><RadarPreview state={document.commandValues} /><div className="preview-copy"><p className="eyebrow">{t("RADAR PREVIEW")}</p><h3>{t("Die ganze Runde im Blick.")}</h3><p>{t("Map-Zoom, Rotation und Icon-Größe werden direkt sichtbar.")}</p></div></div>}

                  {module.kind === "settings" && <div className="command-list">{categoryCommands.map((command) => <CommandControl key={command.name} command={command} state={document.commandValues} onChange={onCommandChange} />)}</div>}
                  {module.kind === "standard-binds" && <StandardBindsModule document={document} query={deferredQuery} onChange={onDocumentChange} enabledOnly={activeOnly} />}
                  {module.kind === "multi-binds" && <MultiBindsModule document={document} query={deferredQuery} onChange={onDocumentChange} enabledOnly={activeOnly} />}
                  {module.kind === "custom-binds" && <CustomBindsModule document={document} query={deferredQuery} onChange={onDocumentChange} enabledOnly={activeOnly} />}
                </section>
              );
            })}

              {!visibleModules.length && (
                <div className="empty-state">
                <Search size={26} />
                <h2>{t(normalizedQuery ? (activeOnly ? "Kein aktiver Part gefunden" : "Kein Command gefunden") : "Diese Config ist noch leer")}</h2>
                <p>{t(normalizedQuery
                  ? (activeOnly ? "Die Suche berücksichtigt hier nur aktive Inhalte. Wechsle auf „Alle Commands“." : "Versuche einen anderen Namen oder Console-Command.")
                  : "Wechsle auf „Alle Commands“ und aktiviere deine ersten Einstellungen.")}</p>
                {normalizedQuery
                  ? <Button variant="outline" className="ghost-button" onClick={() => onQueryChange("")}>{t("Suche löschen")}</Button>
                  : activeOnly && <Button variant="outline" className="ghost-button" onClick={() => onShowAllCommandsChange(true)}>{t("Alle Commands")}</Button>}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <ConfigOutline
        entries={outlineEntries}
        scrollRef={scrollRef}
        activeCount={activeCount}
        totalCount={modules.length}
      />
    </div>
  );
}
