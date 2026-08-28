"use client";

import type { ChangeEvent, RefObject } from "react";
import { Import, RotateCcw, Search, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { isCommandEditable, type CommandDefinition } from "../catalog/commands";
import { resolveBindings } from "../domain/bindings";
import type { ConfigType, GeneratorDocument } from "../domain/types";
import { getConfigTypeDefinition, isCommandAvailable, type ConfigTypeDefinition } from "../domain/config-types";
import { moduleDocumentItemCount, type GeneratorModule, type GeneratorModuleId } from "../modules/registry";
import { CustomBindsModule, MultiBindsModule, StandardBindsModule } from "./bind-modules";
import { CommandControl } from "./command-control";
import { generatorModuleIcons } from "./module-icons";
import { CrosshairPreview, RadarPreview, ViewmodelPreview } from "./previews";

type Props = {
  document: GeneratorDocument;
  query: string;
  activeCategory: "all" | GeneratorModuleId;
  commands: CommandDefinition[];
  modules: GeneratorModule[];
  configTypes: ConfigTypeDefinition[];
  importRef: RefObject<HTMLInputElement | null>;
  searchRef: RefObject<HTMLInputElement | null>;
  onQueryChange(query: string): void;
  onCategoryChange(category: "all" | GeneratorModuleId): void;
  onConfigTypeChange(configType: ConfigType): void;
  onCommandChange(name: string, value: string | number | boolean): void;
  onDocumentChange(document: GeneratorDocument): void;
  onImport(event: ChangeEvent<HTMLInputElement>): void;
  onReset(): void;
};

export function GeneratorWorkspace({
  document,
  query,
  activeCategory,
  commands,
  modules,
  configTypes,
  importRef,
  searchRef,
  onQueryChange,
  onCategoryChange,
  onConfigTypeChange,
  onCommandChange,
  onDocumentChange,
  onImport,
  onReset,
}: Props) {
  const { t } = useTranslation();
  const normalizedQuery = query.trim().toLowerCase();
  const overviewMode = activeCategory === "all";
  const definition = getConfigTypeDefinition(document.configType);

  function commandMatches(command: CommandDefinition) {
    return `${command.label} ${command.name} ${command.description} ${command.status.verification} ${command.status.restrictions.join(" ")} ${command.status.checkedVersion}`.toLowerCase().includes(normalizedQuery);
  }

  function moduleHasItemMatch(module: GeneratorModule) {
    if (module.kind === "standard-binds") return resolveBindings(document).some((binding) =>
      binding.source === "standard" && `${binding.label} ${t(binding.label)} ${binding.command} ${binding.key}`.toLowerCase().includes(normalizedQuery));
    if (module.kind === "multi-binds") return document.multiBinds.some((binding) =>
      (!overviewMode || binding.enabled) && `${binding.label} ${t(binding.label)} ${binding.keys.join(" ")}`.toLowerCase().includes(normalizedQuery));
    if (module.kind === "custom-binds") return document.customBinds.some((binding) =>
      (!overviewMode || binding.enabled) && `${binding.label} ${t(binding.label)} ${binding.command} ${binding.key}`.toLowerCase().includes(normalizedQuery));
    return false;
  }

  function moduleMatches(module: GeneratorModule) {
    if (activeCategory !== "all" && activeCategory !== module.id) return false;
    if (overviewMode && moduleDocumentItemCount(module, document, true) === 0) return false;
    if (!normalizedQuery) return true;
    if (module.kind !== "settings") {
      const moduleText = overviewMode
        ? `${module.label} ${module.shortLabel} ${module.description}`.toLowerCase()
        : module.searchableText;
      return moduleText.includes(normalizedQuery) || moduleHasItemMatch(module);
    }
    return commands.some((command) => command.category === module.id &&
      isCommandEditable(command) &&
      isCommandAvailable(document.configType, command) &&
      (!overviewMode || Boolean(document.commandValues[`enabled:${command.name}`])) && commandMatches(command));
  }

  return (
    <div className="workspace">
      <div className="workspace-inner">
        <header className="page-head">
          <p className="eyebrow">{t("DEINE CONFIG. DEINE REGELN.")}</p>
          <div className="page-title-row">
            <div>
              <h1>{overviewMode ? t("Deine aktuelle Config.") : t("Baue dein perfektes Setup.")}</h1>
              <p className="page-lead">{overviewMode
                ? t("Hier siehst und bearbeitest du nur die Parts, die in deiner ausgewählten Config aktiv sind.")
                : t("Aktiviere neue Commands und Binds für deine Config. Jede Änderung landet sofort in deiner Ausgabe.")}</p>
            </div>
            <Label className="config-type-select">
              <span>{t("Config-Art")}</span>
              <Select value={document.configType} onValueChange={(value) => onConfigTypeChange(value as ConfigType)}>
                <SelectTrigger aria-label={t("Config-Art auswählen")}><SelectValue>{configTypes.find((type) => type.id === document.configType)?.label}</SelectValue></SelectTrigger>
                <SelectContent align="end" position="popper">
                  {configTypes.map((type) => <SelectItem key={type.id} value={type.id}>{type.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <small>{configTypes.find((type) => type.id === document.configType)?.description}</small>
            </Label>
          </div>
        </header>

        <div className="toolbar">
          <div className="search-wrap">
            <Search size={17} />
            <Input ref={searchRef} value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder={t("Command oder Einstellung suchen … z. B. radar, sensitivity, fps_max")} />
            {query
              ? <Button variant="ghost" size="icon-xs" className="search-clear" onClick={() => onQueryChange("")} aria-label={t("Suche löschen")}><X size={15} /></Button>
              : <kbd>⌘K</kbd>}
          </div>
          <div className="toolbar-actions">
            <Input ref={importRef} type="file" accept=".cfg,.vcfg,.kv3,.txt,text/plain" multiple hidden onChange={onImport} />
            <Tooltip>
              <TooltipTrigger asChild><Button variant="outline" className="ghost-button" onClick={() => importRef.current?.click()}><Import size={16} />{t("Config importieren")}</Button></TooltipTrigger>
              <TooltipContent>{t(definition.outputKind === "launch-options" ? "Bestehende Launch Options einlesen" : "CFG-, VCFG- oder KV3-Dateien einlesen")}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild><Button variant="outline" size="icon" className="icon-button" aria-label={t("Auf Standard zurücksetzen")} onClick={onReset}><RotateCcw size={16} /></Button></TooltipTrigger>
              <TooltipContent>{t("Auf Standard zurücksetzen")}</TooltipContent>
            </Tooltip>
          </div>
        </div>

        <div className="mobile-category-row">
          <Button variant="outline" className={activeCategory === "all" ? "active" : ""} onClick={() => onCategoryChange("all")}>{t("Aktuelle Config")}</Button>
          {modules.map((module) => <Button variant="outline" key={module.id} className={activeCategory === module.id ? "active" : ""} onClick={() => onCategoryChange(module.id)}>{module.shortLabel}</Button>)}
        </div>

        <div className="settings-flow">
          {modules.map((module) => {
            if (!moduleMatches(module)) return null;
            const Icon = generatorModuleIcons[module.id];
            const categoryCommands = module.kind === "settings"
              ? commands.filter((command) => command.category === module.id &&
                isCommandEditable(command) &&
                isCommandAvailable(document.configType, command) &&
                (!overviewMode || Boolean(document.commandValues[`enabled:${command.name}`])) &&
                (!normalizedQuery || commandMatches(command)))
              : [];
            const itemCount = module.kind === "settings"
              ? categoryCommands.length
              : moduleDocumentItemCount(module, document, overviewMode);
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
                {module.kind === "standard-binds" && <StandardBindsModule document={document} query={query} onChange={onDocumentChange} enabledOnly={overviewMode} />}
                {module.kind === "multi-binds" && <MultiBindsModule document={document} query={query} onChange={onDocumentChange} enabledOnly={overviewMode} />}
                {module.kind === "custom-binds" && <CustomBindsModule document={document} query={query} onChange={onDocumentChange} enabledOnly={overviewMode} />}
              </section>
            );
          })}

          {!modules.some(moduleMatches) && (
            <div className="empty-state">
              <Search size={26} />
              <h2>{t(normalizedQuery ? (overviewMode ? "Kein aktiver Part gefunden" : "Kein Command gefunden") : (overviewMode ? "Deine Config ist noch leer" : "Keine Inhalte in diesem Bereich"))}</h2>
              <p>{t(normalizedQuery ? (overviewMode ? "Die Suche berücksichtigt in dieser Ansicht nur aktive Inhalte deiner Config." : "Versuche einen anderen Namen oder Console-Command.") : "Wähle links einen Bereich aus und aktiviere deine ersten Einstellungen.")}</p>
              {normalizedQuery
                ? <Button variant="outline" className="ghost-button" onClick={() => onQueryChange("")}>{t("Suche löschen")}</Button>
                : overviewMode && <Button variant="outline" className="ghost-button" onClick={() => onCategoryChange(modules[0]?.id ?? "all")}>{t("Bereich auswählen")}</Button>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
