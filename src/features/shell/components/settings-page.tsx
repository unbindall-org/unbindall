"use client";

import { AtSign, BookOpenCheck, Languages, Library, ShieldCheck, Trash2, User } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Switch } from "@/components/ui/switch";

export function SettingsPage({
  signedIn,
  showAllCommands,
  onShowAllCommandsChange,
  onOpenAccount,
  onOpenAuth,
  onOpenTrash,
  onOpenCommandRegister,
  communityHandle,
  onOpenCommunityProfile,
  onOpenMyPosts,
}: {
  signedIn: boolean;
  showAllCommands: boolean;
  onShowAllCommandsChange(value: boolean): void;
  onOpenAccount(): void;
  onOpenAuth(): void;
  onOpenTrash(): void;
  onOpenCommandRegister(): void;
  communityHandle: string | null;
  onOpenCommunityProfile(): void;
  onOpenMyPosts(): void;
}) {
  const { t } = useTranslation();

  return (
    <div className="settings-page">
      <div className="settings-inner">
        <header className="start-head">
          <p className="eyebrow">{t("EINSTELLUNGEN")}</p>
          <h1>{t("Workspace-Einstellungen")}</h1>
          <p className="page-lead">{t("Gilt für diesen Browser und deinen Account.")}</p>
        </header>

        <section className="settings-card">
          <div className="settings-row">
            <span className="settings-row-icon"><Languages size={16} /></span>
            <div><strong>{t("Sprache")}</strong><p>{t("Sprache der Oberfläche und der Config-Kommentare.")}</p></div>
            <LanguageSwitcher />
          </div>
          <div className="settings-row">
            <span className="settings-row-icon"><BookOpenCheck size={16} /></span>
            <div><strong>{t("Alle Commands anzeigen")}</strong><p>{t("Zeigt im Editor standardmäßig auch Commands, die noch nicht aktiv sind.")}</p></div>
            <Switch checked={showAllCommands} onCheckedChange={onShowAllCommandsChange} aria-label={t("Alle Commands anzeigen")} />
          </div>
        </section>

        <section className="settings-card">
          <div className="settings-row">
            <span className="settings-row-icon"><User size={16} /></span>
            <div><strong>{t("Account")}</strong><p>{signedIn ? t("Verknüpfte Logins, Datenexport und Löschung.") : t("Melde dich an, um Configs im Account zu sichern.")}</p></div>
            {signedIn
              ? <Button variant="outline" className="ghost-button" onClick={onOpenAccount}><ShieldCheck size={15} />{t("Account & Daten")}</Button>
              : <Button className="primary-button" onClick={onOpenAuth}>{t("Anmelden")}</Button>}
          </div>
          {signedIn && (
            <div className="settings-row">
              <span className="settings-row-icon"><Trash2 size={16} /></span>
              <div><strong>{t("Papierkorb")}</strong><p>{t("Gelöschte Configs wiederherstellen oder endgültig entfernen.")}</p></div>
              <Button variant="outline" className="ghost-button" onClick={onOpenTrash}>{t("Öffnen")}</Button>
            </div>
          )}
        </section>

        {signedIn && (
          <section className="settings-card">
            <div className="settings-row">
              <span className="settings-row-icon"><AtSign size={16} /></span>
              <div>
                <strong>{t("Öffentliches Profil")}</strong>
                <p>
                  {communityHandle
                    ? t("communityHandleSet", { handle: communityHandle })
                    : t("Lege einen Handle fest, um Configs zu teilen und mitzureden.")}
                </p>
              </div>
              <Button variant="outline" className="ghost-button" onClick={onOpenCommunityProfile}>
                {communityHandle ? t("Bearbeiten") : t("Handle wählen")}
              </Button>
            </div>
            <div className="settings-row">
              <span className="settings-row-icon"><Library size={16} /></span>
              <div><strong>{t("Meine Beiträge")}</strong><p>{t("Geteilte Configs verwalten und zurückziehen.")}</p></div>
              <Button variant="outline" className="ghost-button" onClick={onOpenMyPosts}>{t("Öffnen")}</Button>
            </div>
          </section>
        )}

        <section className="settings-card">
          <div className="settings-row">
            <span className="settings-row-icon"><BookOpenCheck size={16} /></span>
            <div><strong>{t("Command-Register")}</strong><p>{t("Alle bekannten Commands mit Prüfstatus und CS2-Build.")}</p></div>
            <Button variant="outline" className="ghost-button" onClick={onOpenCommandRegister}>{t("Öffnen")}</Button>
          </div>
        </section>
      </div>
    </div>
  );
}
