"use client";

import { useState } from "react";
import { Eye, Globe, Link2, Lock, TrendingUp } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getConfigTypeDefinition } from "@/features/generator/domain/config-types";
import { configTypeIcons } from "@/features/shell/components/config-type-icons";
import type { WorkspaceFile } from "@/features/workspace/domain/workspace";

const visibilities = [
  { id: "public", label: "Öffentlich", description: "Erscheint im Feed und ist über Suche auffindbar.", Icon: Globe },
  { id: "unlisted", label: "Über Link", description: "Nur wer den Link hat, sieht die Config.", Icon: Link2 },
  { id: "private", label: "Privat", description: "Bleibt in deinem Workspace.", Icon: Lock },
] as const;

/** Mock composer. Nothing is submitted anywhere yet. */
export function CommunityNewPost({ files }: { files: WorkspaceFile[] }) {
  const { t } = useTranslation();
  const [fileId, setFileId] = useState(files[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [tags, setTags] = useState("");
  const [visibility, setVisibility] = useState<string>("public");

  const file = files.find((item) => item.id === fileId);
  const definition = file ? getConfigTypeDefinition(file.configType) : null;
  const Icon = file ? configTypeIcons[file.configType] : null;
  const tagList = tags.split(",").map((tag) => tag.trim()).filter(Boolean).slice(0, 6);

  return (
    <div className="community">
      <div className="community-inner community-compose">
        <span className="mock-badge"><TrendingUp size={13} />{t("Vorschau — Posts werden noch nicht gespeichert")}</span>

        <header className="community-head">
          <div>
            <p className="eyebrow">{t("NEUER POST")}</p>
            <h1>{t("Teile deine Config.")}</h1>
            <p className="page-lead">{t("Wähle eine Datei aus deinem Workspace, beschreibe kurz, wofür sie gedacht ist, und lege fest, wer sie sehen darf.")}</p>
          </div>
        </header>

        <div className="compose-layout">
          <form className="compose-form" onSubmit={(event) => event.preventDefault()}>
            <Label className="new-config-field">
              <span>{t("CONFIG")}</span>
              {files.length ? (
                <Select value={fileId} onValueChange={setFileId}>
                  <SelectTrigger aria-label={t("Config auswählen")}>
                    <SelectValue>{file?.name ?? t("Config wählen")}</SelectValue>
                  </SelectTrigger>
                  <SelectContent position="popper">
                    {files.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name} · {t(getConfigTypeDefinition(item.configType).label)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="compose-hint">{t("Lege zuerst eine Config an, um sie teilen zu können.")}</p>
              )}
            </Label>

            <Label className="new-config-field">
              <span>{t("TITEL")}</span>
              <Input value={title} maxLength={80} placeholder={t("z. B. Faceit-Autoexec für Hybrid-Aim")} onChange={(event) => setTitle(event.target.value)} />
            </Label>

            <Label className="new-config-field">
              <span>{t("BESCHREIBUNG")}</span>
              <textarea
                className="compose-textarea"
                value={summary}
                maxLength={600}
                rows={5}
                placeholder={t("Wofür ist diese Config gedacht? Was ist besonders daran?")}
                onChange={(event) => setSummary(event.target.value)}
              />
              <small>{summary.length}/600</small>
            </Label>

            <Label className="new-config-field">
              <span>{t("TAGS")}</span>
              <Input value={tags} placeholder={t("crosshair, radar, performance")} onChange={(event) => setTags(event.target.value)} />
              <small>{t("Komma-getrennt, maximal sechs.")}</small>
            </Label>

            <fieldset className="visibility-group">
              <legend>{t("SICHTBARKEIT")}</legend>
              {visibilities.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`visibility-card${visibility === item.id ? " is-selected" : ""}`}
                  aria-pressed={visibility === item.id}
                  onClick={() => setVisibility(item.id)}
                >
                  <item.Icon size={16} />
                  <strong>{t(item.label)}</strong>
                  <p>{t(item.description)}</p>
                </button>
              ))}
            </fieldset>

            <div className="new-config-actions">
              <Button type="button" variant="outline" className="ghost-button" disabled>{t("Als Entwurf sichern")}</Button>
              <Button type="submit" className="primary-button" disabled>{t("Veröffentlichen")}</Button>
            </div>
            <p className="compose-hint">{t("Die Veröffentlichung ist noch nicht angebunden — dies ist ein Mockup des Flows.")}</p>
          </form>

          <aside className="compose-preview">
            <p className="outline-title"><Eye size={13} />{t("VORSCHAU")}</p>
            <article className="community-card">
              <header>
                <span className="community-avatar">DU</span>
                <div>
                  <strong>{t("dein-name")}</strong>
                  <small>{t("gerade eben")}</small>
                </div>
                {definition && Icon && <span className="community-type"><Icon size={13} />{t(definition.label)}</span>}
              </header>
              <h2>{title.trim() || t("Titel deines Posts")}</h2>
              <p>{summary.trim() || t("Deine Beschreibung erscheint hier.")}</p>
              <ul className="community-tags">
                {(tagList.length ? tagList : ["tag"]).map((tag) => <li key={tag}>#{tag}</li>)}
              </ul>
            </article>
          </aside>
        </div>
      </div>
    </div>
  );
}
