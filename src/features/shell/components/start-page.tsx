"use client";

import { Compass, FilePlus2, Import, LogIn } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { getConfigTypeDefinition } from "@/features/generator/domain/config-types";
import type { WorkspaceFile } from "@/features/workspace/domain/workspace";
import { configTypeIcons } from "./config-type-icons";

export function StartPage({
  userName,
  recent,
  onOpenFile,
  onNewConfig,
  onImport,
  onOpenCommunity,
  onOpenAuth,
}: {
  userName: string | null;
  recent: WorkspaceFile[];
  onOpenFile(file: WorkspaceFile): void;
  onNewConfig(): void;
  onImport(): void;
  onOpenCommunity(): void;
  onOpenAuth(): void;
}) {
  const { t } = useTranslation();

  return (
    <div className="start-page">
      <div className="start-inner">
        <header className="start-head">
          <p className="eyebrow">{userName ? t("WILLKOMMEN ZURÜCK") : t("DEINE CONFIG. DEINE REGELN.")}</p>
          <h1>{userName ? t("startGreeting", { name: userName }) : t("Bau dir dein CS2-Setup.")}</h1>
          <p className="page-lead">
            {recent.length
              ? t("Mach da weiter, wo du aufgehört hast — oder leg eine neue Datei in einem deiner Projekte an.")
              : t("Ein Projekt bündelt deine Config-Dateien. Leg die erste an oder importiere eine bestehende CFG.")}
          </p>
        </header>

        <div className="start-actions">
          <button type="button" className="start-card" onClick={onNewConfig}>
            <span className="start-card-icon"><FilePlus2 size={18} /></span>
            <strong>{t("Neue Config")}</strong>
            <p>{t("Art wählen, Schnellstart übernehmen, loslegen.")}</p>
          </button>
          <button type="button" className="start-card" onClick={onImport}>
            <span className="start-card-icon"><Import size={18} /></span>
            <strong>{t("CFG importieren")}</strong>
            <p>{t("Bestehende CFG, VCFG oder KV3 verlustfrei einlesen.")}</p>
          </button>
          <button type="button" className="start-card" onClick={onOpenCommunity}>
            <span className="start-card-icon"><Compass size={18} /></span>
            <strong>{t("Community entdecken")}</strong>
            <p>{t("Setups anderer Spieler ansehen und übernehmen.")}</p>
          </button>
        </div>

        {recent.length > 0 && (
          <section className="start-recent">
            <p className="outline-title">{t("ZULETZT BEARBEITET")}</p>
            <ul>
              {recent.map((file) => {
                const Icon = configTypeIcons[file.configType];
                return (
                  <li key={file.id}>
                    <button type="button" onClick={() => onOpenFile(file)}>
                      <span className="start-recent-icon"><Icon size={15} /></span>
                      <span className="start-recent-name">{file.name}</span>
                      <span className="start-recent-type">{t(getConfigTypeDefinition(file.configType).label)}</span>
                      <span className="start-recent-origin">{file.origin === "cloud" ? t("Account") : t("Lokal")}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {!userName && (
          <div className="start-signin">
            <div>
              <strong>{t("Configs geräteübergreifend sichern")}</strong>
              <p>{t("Ohne Account bleibt alles nur in diesem Browser. Mit Account bekommst du Autosave, Versionsverlauf und Papierkorb.")}</p>
            </div>
            <Button className="primary-button" onClick={onOpenAuth}><LogIn size={16} />{t("Anmelden")}</Button>
          </div>
        )}
      </div>
    </div>
  );
}
