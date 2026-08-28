"use client";

import { CheckCircle2, Flag, MessageSquareWarning, ShieldCheck } from "lucide-react";
import { useTranslation } from "react-i18next";

export function ModerationPage() {
  const { t } = useTranslation();

  return (
    <div className="role-page">
      <div className="role-inner">
        <header className="start-head">
          <p className="eyebrow">{t("MODERATION")}</p>
          <h1>{t("Moderatorenbereich")}</h1>
          <p className="page-lead">{t("Gemeldete Community-Inhalte prüfen und Entscheidungen nachvollziehbar bearbeiten.")}</p>
        </header>

        <div className="role-overview">
          <article className="role-stat">
            <span><Flag size={17} /></span>
            <div><strong>0</strong><p>{t("Offene Meldungen")}</p></div>
          </article>
          <article className="role-stat">
            <span><MessageSquareWarning size={17} /></span>
            <div><strong>0</strong><p>{t("In Prüfung")}</p></div>
          </article>
          <article className="role-stat">
            <span><CheckCircle2 size={17} /></span>
            <div><strong>0</strong><p>{t("Heute bearbeitet")}</p></div>
          </article>
        </div>

        <section className="role-card role-empty">
          <span className="role-empty-icon"><ShieldCheck size={22} /></span>
          <strong>{t("Keine offenen Meldungen")}</strong>
          <p>{t("Sobald Community-Inhalte gemeldet werden, erscheinen sie in dieser Warteschlange.")}</p>
        </section>
      </div>
    </div>
  );
}

