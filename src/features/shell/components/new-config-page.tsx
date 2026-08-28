"use client";

import { useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  FileCode2,
  FolderKanban,
  LoaderCircle,
  Lock,
  Sparkles,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { presets } from "@/features/generator/catalog/commands";
import {
  configTypes,
  defaultConfigName,
  getConfigTypeDefinition,
  presetsForConfigType,
} from "@/features/generator/domain/config-types";
import type { ConfigType } from "@/features/generator/domain/types";
import type { WorkspaceProject } from "@/features/workspace/domain/workspace";
import { configTypeIcons } from "./config-type-icons";

export type NewConfigRequest = {
  projectId: string;
  name: string;
  configType: ConfigType;
  presetName: string | null;
};

const steps = [
  { label: "Config-Art", description: "Format und Einsatzzweck" },
  { label: "Vorlage", description: "Sinnvolle Startwerte" },
  { label: "Details", description: "Name und Zielprojekt" },
] as const;

/**
 * The only place a config type is ever chosen. Afterwards the type is fixed —
 * changing it would silently invalidate commands in the generated document.
 */
export function NewConfigPage({
  projects,
  defaultProjectId,
  pending,
  onCancel,
  onCreate,
}: {
  projects: WorkspaceProject[];
  defaultProjectId: string | null;
  pending: boolean;
  onCancel(): void;
  onCreate(request: NewConfigRequest): void;
}) {
  const { t } = useTranslation();
  const [step, setStep] = useState(0);
  const [configType, setConfigType] = useState<ConfigType>("matchmaking");
  const [projectId, setProjectId] = useState(defaultProjectId ?? projects[0]?.id ?? "");
  const [name, setName] = useState("");
  const [presetName, setPresetName] = useState<string | null>(null);

  const availablePresets = useMemo(() => {
    const allowed = presetsForConfigType(configType);
    return presets.filter((preset) => allowed.has(preset.name));
  }, [configType]);

  const resolvedProjectId = projects.some((project) => project.id === projectId)
    ? projectId
    : projects.some((project) => project.id === defaultProjectId)
      ? defaultProjectId ?? ""
      : projects[0]?.id ?? "";
  const definition = getConfigTypeDefinition(configType);
  const selectedProject = projects.find((project) => project.id === resolvedProjectId);
  const selectedPreset = presets.find((preset) => preset.name === presetName);
  const resolvedName = name.trim() || t(defaultConfigName(configType));

  function chooseType(type: ConfigType) {
    if (type === configType) return;
    setConfigType(type);
    setPresetName(null);
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (step < steps.length - 1) {
      setStep((current) => current + 1);
      return;
    }
    if (!resolvedProjectId || pending) return;
    onCreate({ projectId: resolvedProjectId, name: resolvedName, configType, presetName });
  }

  return (
    <main className="new-config-page">
      <div className="new-config-page-inner">
        <header className="new-config-page-head">
          <button type="button" className="new-config-back" onClick={onCancel}>
            <ArrowLeft size={15} />
            {t("Zurück zum Workspace")}
          </button>
          <div>
            <p className="eyebrow">{t("NEUE CONFIG")}</p>
            <h1>{t("Neue Config erstellen")}</h1>
            <p className="page-lead">
              {t("Richte eine einsatzbereite Config in drei kurzen Schritten ein.")}
            </p>
          </div>
        </header>

        <nav className="wizard-progress" aria-label={t("Fortschritt der Config-Erstellung")}>
          <ol>
            {steps.map((item, index) => {
              const complete = index < step;
              const current = index === step;
              return (
                <li key={item.label} className={current ? "is-current" : complete ? "is-complete" : ""}>
                  <button
                    type="button"
                    disabled={index > step}
                    aria-current={current ? "step" : undefined}
                    onClick={() => { if (index < step) setStep(index); }}
                  >
                    <span className="wizard-step-index">{complete ? <Check size={13} /> : index + 1}</span>
                    <span>
                      <strong>{t(item.label)}</strong>
                      <small>{t(item.description)}</small>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>

        <div className="new-config-layout">
          <form className="wizard-panel" onSubmit={submit}>
            <div className="wizard-panel-body">
              {step === 0 && (
                <section className="wizard-step" aria-labelledby="config-type-heading">
                  <div className="wizard-step-head">
                    <span className="wizard-step-kicker">{t("SCHRITT 1 VON 3")}</span>
                    <h2 id="config-type-heading">{t("Welche Config möchtest du erstellen?")}</h2>
                    <p>{t("Die Art legt Ausgabeformat und verfügbare Commands fest. Sie kann später nicht geändert werden.")}</p>
                  </div>

                  <fieldset className="wizard-type-grid">
                    <legend className="sr-only">{t("Config-Art auswählen")}</legend>
                    {configTypes.map((type) => {
                      const Icon = configTypeIcons[type.id];
                      const selected = configType === type.id;
                      return (
                        <button
                          key={type.id}
                          type="button"
                          className={`wizard-choice-card${selected ? " is-selected" : ""}`}
                          aria-pressed={selected}
                          onClick={() => chooseType(type.id)}
                        >
                          <span className="wizard-choice-icon"><Icon size={20} /></span>
                          <span className="wizard-choice-copy">
                            <strong>{t(type.label)}</strong>
                            <small>{t(type.description)}</small>
                          </span>
                          <code>{type.fileName}</code>
                          <span className="wizard-choice-check" aria-hidden="true"><Check size={12} /></span>
                        </button>
                      );
                    })}
                  </fieldset>
                </section>
              )}

              {step === 1 && (
                <section className="wizard-step" aria-labelledby="preset-heading">
                  <div className="wizard-step-head">
                    <span className="wizard-step-kicker">{t("SCHRITT 2 VON 3")}</span>
                    <h2 id="preset-heading">{t("Wähle deinen Ausgangspunkt")}</h2>
                    <p>{t("Vorlagen setzen bewährte Werte vor. Im Editor bleibt anschließend jede Einstellung anpassbar.")}</p>
                  </div>

                  <fieldset className="wizard-preset-list">
                    <legend className="sr-only">{t("Vorlage auswählen")}</legend>
                    <button
                      type="button"
                      className={`wizard-preset-card${presetName === null ? " is-selected" : ""}`}
                      aria-pressed={presetName === null}
                      onClick={() => setPresetName(null)}
                    >
                      <span className="wizard-preset-icon"><FileCode2 size={18} /></span>
                      <span>
                        <strong>{t("Leer starten")}</strong>
                        <small>{t("Eine saubere Config mit sicheren Standardwerten erstellen.")}</small>
                      </span>
                      <span className="wizard-radio" aria-hidden="true" />
                    </button>
                    {availablePresets.map((preset, index) => (
                      <button
                        key={preset.name}
                        type="button"
                        className={`wizard-preset-card${presetName === preset.name ? " is-selected" : ""}`}
                        aria-pressed={presetName === preset.name}
                        onClick={() => setPresetName(preset.name)}
                      >
                        <span className="wizard-preset-icon"><Sparkles size={18} /></span>
                        <span>
                          <strong>
                            {t(preset.label)}
                            {index === 0 && <em>{t("EMPFOHLEN")}</em>}
                          </strong>
                          <small>{t(preset.description)}</small>
                        </span>
                        <span className="wizard-radio" aria-hidden="true" />
                      </button>
                    ))}
                  </fieldset>

                  {!availablePresets.length && (
                    <p className="wizard-context-note">
                      <CheckCircle2 size={15} />
                      {t("Für diese Config-Art sind die Standardwerte der empfohlene Startpunkt.")}
                    </p>
                  )}
                </section>
              )}

              {step === 2 && (
                <section className="wizard-step" aria-labelledby="details-heading">
                  <div className="wizard-step-head">
                    <span className="wizard-step-kicker">{t("SCHRITT 3 VON 3")}</span>
                    <h2 id="details-heading">{t("Fast fertig")}</h2>
                    <p>{t("Gib der Config einen eindeutigen Namen und ordne sie dem passenden Projekt zu.")}</p>
                  </div>

                  <div className="wizard-details">
                    <Label className="wizard-field" htmlFor="new-config-name">
                      <span>{t("Config-Name")}</span>
                      <Input
                        id="new-config-name"
                        value={name}
                        maxLength={60}
                        autoFocus
                        placeholder={t(defaultConfigName(configType))}
                        onChange={(event) => setName(event.target.value)}
                      />
                      <small>
                        <span>{t("Wird im Explorer und in geöffneten Tabs angezeigt.")}</span>
                        <span>{name.length}/60</span>
                      </small>
                    </Label>

                    <Label className="wizard-field">
                      <span>{t("Projekt")}</span>
                      <Select value={resolvedProjectId} onValueChange={setProjectId}>
                        <SelectTrigger aria-label={t("Projekt auswählen")}>
                          <SelectValue>{selectedProject?.name ?? t("Projekt wählen")}</SelectValue>
                        </SelectTrigger>
                        <SelectContent position="popper">
                          {projects.map((project) => (
                            <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <small>{t("Du kannst die Datei später in ein anderes Projekt verschieben.")}</small>
                    </Label>
                  </div>

                  <div className="wizard-ready-note">
                    <CheckCircle2 size={18} />
                    <div>
                      <strong>{t("Bereit zum Erstellen")}</strong>
                      <p>{t("Die Config wird angelegt und direkt im Editor geöffnet.")}</p>
                    </div>
                  </div>
                </section>
              )}
            </div>

            <footer className="wizard-actions">
              <Button type="button" variant="outline" className="ghost-button" onClick={step === 0 ? onCancel : () => setStep(step - 1)}>
                <ArrowLeft size={15} />{step === 0 ? t("Abbrechen") : t("Zurück")}
              </Button>
              <span>{t("Schritt {{current}} von {{total}}", { current: step + 1, total: steps.length })}</span>
              <Button type="submit" className="primary-button" disabled={pending || !resolvedProjectId}>
                {pending ? <LoaderCircle size={15} className="spin" /> : step === 2 ? <Check size={15} /> : null}
                {step === 2 ? (pending ? t("Config wird angelegt …") : t("Config anlegen")) : t("Weiter")}
                {step < 2 && <ArrowRight size={15} />}
              </Button>
            </footer>
          </form>

          <aside className="wizard-summary" aria-label={t("Zusammenfassung")}>
            <div className="wizard-summary-head">
              <span>{t("DEINE AUSWAHL")}</span>
              <CheckCircle2 size={16} />
            </div>
            <div className="wizard-summary-file">
              {(() => {
                const Icon = configTypeIcons[configType];
                return <span><Icon size={21} /></span>;
              })()}
              <div>
                <strong>{resolvedName}</strong>
                <code>{definition.fileName}</code>
              </div>
            </div>
            <dl>
              <div>
                <dt>{t("Config-Art")}</dt>
                <dd>{t(definition.label)}</dd>
              </div>
              <div>
                <dt>{t("Vorlage")}</dt>
                <dd>{selectedPreset ? t(selectedPreset.label) : t("Leer starten")}</dd>
              </div>
              <div>
                <dt>{t("Projekt")}</dt>
                <dd><FolderKanban size={13} />{selectedProject?.name ?? t("Projekt wählen")}</dd>
              </div>
            </dl>
            <p className="wizard-lock-note">
              <Lock size={14} />
              {t("Die Config-Art ist nach dem Erstellen fest. Name, Projekt und alle Werte bleiben anpassbar.")}
            </p>
          </aside>
        </div>
      </div>
    </main>
  );
}
