"use client";

import { useMemo, useState } from "react";
import { Lock, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { presets } from "@/features/generator/catalog/commands";
import { configTypes, defaultConfigName, presetsForConfigType } from "@/features/generator/domain/config-types";
import type { ConfigType } from "@/features/generator/domain/types";
import type { WorkspaceProject } from "@/features/workspace/domain/workspace";
import { configTypeIcons } from "./config-type-icons";

export type NewConfigRequest = {
  projectId: string;
  name: string;
  configType: ConfigType;
  presetName: string | null;
};

/**
 * The only place a config type is ever chosen. Afterwards the type is fixed —
 * changing it would silently invalidate every command in the document, so the
 * editor offers "duplicate as" instead.
 */
export function NewConfigDialog({
  open,
  projects,
  defaultProjectId,
  pending,
  onOpenChange,
  onCreate,
}: {
  open: boolean;
  projects: WorkspaceProject[];
  defaultProjectId: string | null;
  pending: boolean;
  onOpenChange(open: boolean): void;
  onCreate(request: NewConfigRequest): void;
}) {
  const { t } = useTranslation();
  const [configType, setConfigType] = useState<ConfigType>("matchmaking");
  const [projectId, setProjectId] = useState(defaultProjectId ?? "");
  const [name, setName] = useState("");
  const [presetName, setPresetName] = useState<string | null>(null);

  // Reset while rendering rather than in an effect: opening the dialog always
  // starts from a clean sheet without a second render pass.
  const [wasOpen, setWasOpen] = useState(false);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setConfigType("matchmaking");
      setProjectId(defaultProjectId ?? projects[0]?.id ?? "");
      setName("");
      setPresetName(null);
    }
  }

  const availablePresets = useMemo(() => {
    const allowed = presetsForConfigType(configType);
    return presets.filter((preset) => allowed.has(preset.name));
  }, [configType]);

  const [presetFor, setPresetFor] = useState<ConfigType>(configType);
  if (presetFor !== configType) {
    setPresetFor(configType);
    setPresetName(null);
  }

  const resolvedName = name.trim() || t(defaultConfigName(configType));

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!projectId) return;
    onCreate({ projectId, name: resolvedName, configType, presetName });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="new-config-dialog">
        <DialogHeader>
          <DialogTitle>{t("Neue Config")}</DialogTitle>
          <DialogDescription>
            {t("Die Config-Art bestimmt, welche Commands zur Verfügung stehen. Sie lässt sich später nicht mehr ändern.")}
          </DialogDescription>
        </DialogHeader>

        <form className="new-config-form" onSubmit={submit}>
          <fieldset className="type-grid">
            <legend>{t("CONFIG-ART")}</legend>
            {configTypes.map((type) => {
              const Icon = configTypeIcons[type.id];
              return (
                <button
                  key={type.id}
                  type="button"
                  className={`type-card${configType === type.id ? " is-selected" : ""}`}
                  aria-pressed={configType === type.id}
                  onClick={() => setConfigType(type.id)}
                >
                  <span className="type-card-icon"><Icon size={17} /></span>
                  <strong>{t(type.label)}</strong>
                  <p>{t(type.description)}</p>
                  <code>{type.fileName}</code>
                </button>
              );
            })}
          </fieldset>

          <div className="new-config-row">
            <Label className="new-config-field">
              <span>{t("NAME")}</span>
              <Input
                value={name}
                maxLength={60}
                placeholder={t(defaultConfigName(configType))}
                onChange={(event) => setName(event.target.value)}
              />
            </Label>
            <Label className="new-config-field">
              <span>{t("PROJEKT")}</span>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger aria-label={t("Projekt auswählen")}>
                  <SelectValue>{projects.find((project) => project.id === projectId)?.name ?? t("Projekt wählen")}</SelectValue>
                </SelectTrigger>
                <SelectContent position="popper">
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Label>
          </div>

          {availablePresets.length > 0 && (
            <div className="preset-row">
              <span className="preset-row-label"><Sparkles size={13} />{t("SCHNELLSTART")}</span>
              <div className="preset-chips">
                <button
                  type="button"
                  className={presetName === null ? "is-selected" : ""}
                  onClick={() => setPresetName(null)}
                >{t("Leer starten")}</button>
                {availablePresets.map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    className={presetName === preset.name ? "is-selected" : ""}
                    title={t(preset.description)}
                    onClick={() => setPresetName(preset.name)}
                  >{t(preset.label)}</button>
                ))}
              </div>
            </div>
          )}

          <p className="new-config-note"><Lock size={13} />{t("Die Art ist danach fest. Für eine andere Art legst du eine neue Datei an.")}</p>

          <div className="new-config-actions">
            <Button type="button" variant="outline" className="ghost-button" onClick={() => onOpenChange(false)}>
              {t("Abbrechen")}
            </Button>
            <Button type="submit" className="primary-button" disabled={pending || !projectId}>
              {t("Config anlegen")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
