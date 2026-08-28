"use client";

import { LoaderCircle, LogIn, Trash2, Undo2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

export type TrashedConfigView = {
  id: string;
  name: string;
  revision: number;
  deletedAt: string | null;
};

export function TrashPage({
  signedIn,
  items,
  loading,
  onUndelete,
  onSelectPermanentDelete,
  onOpenAuth,
}: {
  signedIn: boolean;
  items: TrashedConfigView[];
  loading: boolean;
  onUndelete(config: TrashedConfigView): void;
  onSelectPermanentDelete(config: TrashedConfigView): void;
  onOpenAuth(): void;
}) {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage === "en" ? "en-US" : "de-DE";

  return (
    <div className="page">
      <div className="page-inner">
        <header className="page-header">
          <p className="eyebrow">{t("PAPIERKORB")}</p>
          <h1>{t("Gelöschte Configs")}</h1>
          <p className="page-lead">{t("Gelöschte Configs bleiben mit vollem Versionsverlauf wiederherstellbar, bis du sie endgültig entfernst.")}</p>
        </header>

        {!signedIn ? (
          <div className="empty-state">
            <Trash2 size={26} />
            <h2>{t("Papierkorb gehört zum Account")}</h2>
            <p>{t("Lokale Configs werden sofort entfernt. Melde dich an, damit gelöschte Configs wiederherstellbar bleiben.")}</p>
            <Button className="primary-button" onClick={onOpenAuth}><LogIn size={16} />{t("Anmelden")}</Button>
          </div>
        ) : loading ? (
          <div className="page-loading"><LoaderCircle className="spin" size={22} />{t("Papierkorb wird geladen …")}</div>
        ) : items.length ? (
          <ul className="record-list">
            {items.map((config) => (
              <li className="record-row" key={config.id}>
                <span className="record-icon"><Trash2 size={16} /></span>
                <div className="record-main">
                  <strong>{config.name}</strong>
                  <small>{config.deletedAt
                    ? t("deletedAt", { date: new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(config.deletedAt)) })
                    : t("Gelöscht")}</small>
                </div>
                <Button variant="outline" size="sm" className="ghost-button" onClick={() => onUndelete(config)}>
                  <Undo2 size={14} />{t("Wiederherstellen")}
                </Button>
                <Button variant="ghost" size="icon" className="icon-button" aria-label={t("Endgültig löschen")} onClick={() => onSelectPermanentDelete(config)}>
                  <Trash2 size={15} />
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="empty-state">
            <Trash2 size={26} />
            <h2>{t("Papierkorb ist leer")}</h2>
            <p>{t("Gelöschte Configs landen hier, bevor sie endgültig verschwinden.")}</p>
          </div>
        )}
      </div>
    </div>
  );
}
