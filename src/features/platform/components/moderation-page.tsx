"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  Eye,
  EyeOff,
  Flag,
  History,
  LoaderCircle,
  MessageSquareWarning,
  ShieldCheck,
  Trash2,
  UserX,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  allowedActions,
  moderationActionLabels,
  reportReasonLabels,
  sanctionLabels,
  type ModerationActionKind,
  type ReportReason,
  type ReportTargetType,
} from "@/features/community/domain/moderation";
import { formatRelativeTime } from "@/features/community/domain/format";
import { useTRPC } from "@/trpc/client";

const actionIcons: Partial<Record<ModerationActionKind, typeof EyeOff>> = {
  hide: EyeOff,
  unhide: Eye,
  remove: Trash2,
  restore: Eye,
  dismiss_report: CheckCircle2,
  ban: UserX,
  publish_ban: UserX,
  mute: UserX,
};

export function ModerationPage({ onOpenPost }: { onOpenPost(slug: string): void }) {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage ?? "de";
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [view, setView] = useState<"queue" | "history">("queue");
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [days, setDays] = useState("");

  const statsQuery = useQuery(trpc.moderation.stats.queryOptions(undefined, { retry: false }));
  const queueQuery = useQuery(trpc.moderation.queue.queryOptions({ limit: 50 }, { retry: false }));
  const historyQuery = useQuery(trpc.moderation.history.queryOptions({ limit: 100 }, {
    retry: false,
    enabled: view === "history",
  }));
  const detailQuery = useQuery(trpc.moderation.report.queryOptions(
    { id: selectedId ?? "00000000-0000-0000-0000-000000000000" },
    { retry: false, enabled: Boolean(selectedId) },
  ));

  const assign = useMutation(trpc.moderation.assign.mutationOptions());
  const act = useMutation(trpc.moderation.act.mutationOptions());

  const queue = queueQuery.data ?? [];
  const detail = detailQuery.data;

  async function refresh() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: trpc.moderation.queue.queryKey() }),
      queryClient.invalidateQueries({ queryKey: trpc.moderation.stats.queryKey() }),
      queryClient.invalidateQueries({ queryKey: trpc.moderation.history.queryKey() }),
      selectedId
        ? queryClient.invalidateQueries({ queryKey: trpc.moderation.report.queryKey({ id: selectedId }) })
        : Promise.resolve(),
    ]);
  }

  async function takeOver(id: string) {
    try {
      await assign.mutateAsync({ id });
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? t(error.message) : t("Meldung konnte nicht übernommen werden."));
    }
  }

  async function decide(action: ModerationActionKind) {
    if (!detail) return;
    if (reason.trim().length < 5) {
      toast.error(t("Eine Entscheidung braucht eine nachvollziehbare Begründung."));
      return;
    }
    const targetType = detail.report.targetType as ReportTargetType;
    // User-level actions target the author, not the reported object.
    const isUserAction = ["warn", "mute", "publish_ban", "ban", "unban"].includes(action);
    const targetId = isUserAction ? detail.author?.userId : detail.report.targetId;
    if (!targetId) {
      toast.error(t("Zu dieser Meldung gibt es keinen Account."));
      return;
    }

    try {
      await act.mutateAsync({
        reportId: detail.report.id,
        targetType: isUserAction ? "user" : targetType,
        targetId,
        action,
        reason: reason.trim(),
        note: note.trim() || undefined,
        expiresInDays: days ? Number(days) : undefined,
      });
      setReason("");
      setNote("");
      setDays("");
      setSelectedId(null);
      await refresh();
      toast.success(t("Entscheidung gespeichert."));
    } catch (error) {
      toast.error(error instanceof Error ? t(error.message) : t("Entscheidung konnte nicht gespeichert werden."));
    }
  }

  const userActions: ModerationActionKind[] = ["warn", "mute", "publish_ban", "ban"];
  const targetActions: ModerationActionKind[] = detail
    ? [...allowedActions(detail.report.targetType as ReportTargetType), ...userActions]
        .filter((action, index, list) => list.indexOf(action) === index)
    : [];

  return (
    <div className="role-page">
      <div className="role-inner role-inner-wide">
        <header className="start-head">
          <p className="eyebrow">{t("MODERATION")}</p>
          <h1>{t("Moderatorenbereich")}</h1>
          <p className="page-lead">{t("Gemeldete Community-Inhalte prüfen und Entscheidungen nachvollziehbar bearbeiten.")}</p>
        </header>

        <div className="role-overview">
          <article className="role-stat">
            <span><Flag size={17} /></span>
            <div><strong>{statsQuery.data?.open ?? 0}</strong><p>{t("Offene Meldungen")}</p></div>
          </article>
          <article className="role-stat">
            <span><MessageSquareWarning size={17} /></span>
            <div><strong>{statsQuery.data?.inReview ?? 0}</strong><p>{t("In Prüfung")}</p></div>
          </article>
          <article className="role-stat">
            <span><CheckCircle2 size={17} /></span>
            <div><strong>{statsQuery.data?.handledToday ?? 0}</strong><p>{t("Heute bearbeitet")}</p></div>
          </article>
        </div>

        <div className="community-filters moderation-tabs">
          <button type="button" className={view === "queue" ? "is-active" : ""} onClick={() => setView("queue")}>
            {t("Warteschlange")}
          </button>
          <button type="button" className={view === "history" ? "is-active" : ""} onClick={() => setView("history")}>
            <History size={13} />{t("Verlauf")}
          </button>
        </div>

        {view === "history" ? (
          <section className="role-card">
            {historyQuery.isPending && (
              <p className="role-loading"><LoaderCircle className="spin" size={16} />{t("Verlauf wird geladen …")}</p>
            )}
            <ul className="moderation-history">
              {(historyQuery.data ?? []).map((entry) => (
                <li key={entry.id}>
                  <strong>{t(moderationActionLabels[entry.action as ModerationActionKind])}</strong>
                  <span>{entry.reason}</span>
                  <small>
                    {entry.moderator} · {entry.targetType} · {formatRelativeTime(entry.createdAt, locale)}
                  </small>
                </li>
              ))}
            </ul>
            {!historyQuery.isPending && !(historyQuery.data ?? []).length && (
              <div className="role-empty">
                <span className="role-empty-icon"><History size={22} /></span>
                <strong>{t("Noch keine Entscheidungen")}</strong>
                <p>{t("Jede Moderationsentscheidung wird hier unveränderlich protokolliert.")}</p>
              </div>
            )}
          </section>
        ) : (
          <div className="moderation-layout">
            <section className="role-card">
              <div className="role-card-head">
                <strong>{t("Warteschlange")}</strong>
                <p>{t("Älteste zuerst bearbeiten. Übernimm eine Meldung, bevor du entscheidest.")}</p>
              </div>

              {queueQuery.isPending && (
                <p className="role-loading"><LoaderCircle className="spin" size={16} />{t("Meldungen werden geladen …")}</p>
              )}

              {queue.length > 0 && (
                <ul className="moderation-queue">
                  {queue.map((item) => (
                    <li key={item.id} className={selectedId === item.id ? "is-selected" : ""}>
                      <button type="button" onClick={() => setSelectedId(item.id)}>
                        <span className="queue-reason">
                          {item.source === "system" ? t("Automatische Prüfung") : t(reportReasonLabels[item.reason as ReportReason])}
                        </span>
                        <strong>{item.target?.title || t("Inhalt gelöscht")}</strong>
                        <small>
                          {t(`target.${item.targetType}`)} · {formatRelativeTime(item.createdAt, locale)}
                          {item.status === "in_review" ? ` · ${t("In Prüfung")}` : ""}
                        </small>
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {!queueQuery.isPending && !queue.length && (
                <div className="role-empty">
                  <span className="role-empty-icon"><ShieldCheck size={22} /></span>
                  <strong>{t("Keine offenen Meldungen")}</strong>
                  <p>{t("Sobald Community-Inhalte gemeldet werden, erscheinen sie in dieser Warteschlange.")}</p>
                </div>
              )}
            </section>

            <section className="role-card moderation-detail">
              {!selectedId && (
                <div className="role-empty">
                  <span className="role-empty-icon"><Flag size={22} /></span>
                  <strong>{t("Keine Meldung ausgewählt")}</strong>
                  <p>{t("Wähle links eine Meldung, um Inhalt, Vorgeschichte und Aktionen zu sehen.")}</p>
                </div>
              )}

              {selectedId && detailQuery.isPending && (
                <p className="role-loading"><LoaderCircle className="spin" size={16} />{t("Meldung wird geladen …")}</p>
              )}

              {detail && (
                <div className="moderation-detail-body">
                  <div className="role-card-head">
                    <strong>
                      {detail.report.source === "system"
                        ? t("Automatische Prüfung")
                        : t(reportReasonLabels[detail.report.reason as ReportReason])}
                    </strong>
                    <p>{detail.report.note || t("Ohne weitere Angaben.")}</p>
                  </div>

                  <div className="moderation-content">
                    <p className="outline-title">{t("GEMELDETER INHALT")}</p>
                    {detail.target ? (
                      <>
                        <strong>{detail.target.title}</strong>
                        <p>{detail.target.body || t("Ohne Text.")}</p>
                        <small>{t("Status")}: {detail.target.status}</small>
                        {detail.target.slug && detail.report.targetType !== "user" && (
                          <button type="button" className="ghost-button" onClick={() => onOpenPost(detail.target!.slug!)}>
                            {t("Im Feed öffnen")}
                          </button>
                        )}
                      </>
                    ) : <p>{t("Der Inhalt existiert nicht mehr.")}</p>}
                  </div>

                  {detail.author && (
                    <div className="moderation-author">
                      <p className="outline-title">{t("AUTOR")}</p>
                      <strong>@{detail.author.author.handle}</strong>
                      <small>
                        {t("countPosts", { count: detail.author.postCount })} ·{" "}
                        {t("countPriorActions", { count: detail.author.priorActionCount })} ·{" "}
                        {t("memberSince", { date: formatRelativeTime(detail.author.memberSince, locale) })}
                      </small>
                      {detail.author.sanctions.length > 0 && (
                        <ul className="moderation-sanctions">
                          {detail.author.sanctions.map((sanction) => (
                            <li key={sanction.id}>
                              {t(sanctionLabels[sanction.kind as keyof typeof sanctionLabels])}
                              {sanction.expiresAt ? ` · ${formatRelativeTime(sanction.expiresAt, locale)}` : ` · ${t("unbefristet")}`}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}

                  {detail.history.length > 0 && (
                    <div className="moderation-prior">
                      <p className="outline-title">{t("BISHERIGE ENTSCHEIDUNGEN")}</p>
                      <ul>
                        {detail.history.map((entry) => (
                          <li key={entry.id}>
                            <strong>{t(moderationActionLabels[entry.action as ModerationActionKind])}</strong>
                            <span>{entry.reason}</span>
                            <small>{entry.moderator} · {formatRelativeTime(entry.createdAt, locale)}</small>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {detail.report.status === "open" && (
                    <Button variant="outline" className="ghost-button" onClick={() => void takeOver(detail.report.id)}>
                      {t("Meldung übernehmen")}
                    </Button>
                  )}

                  <Label className="new-config-field">
                    <span>{t("BEGRÜNDUNG (PFLICHT)")}</span>
                    <textarea
                      className="compose-textarea"
                      rows={3}
                      value={reason}
                      maxLength={500}
                      placeholder={t("Warum wird so entschieden? Diese Begründung bleibt dauerhaft im Protokoll.")}
                      onChange={(event) => setReason(event.target.value)}
                    />
                  </Label>

                  <Label className="new-config-field">
                    <span>{t("INTERNE NOTIZ (OPTIONAL)")}</span>
                    <textarea
                      className="compose-textarea"
                      rows={2}
                      value={note}
                      maxLength={1000}
                      onChange={(event) => setNote(event.target.value)}
                    />
                  </Label>

                  <Label className="new-config-field">
                    <span>{t("SPERRDAUER IN TAGEN (LEER = UNBEFRISTET)")}</span>
                    <input
                      className="moderation-days"
                      type="number"
                      min={1}
                      max={3650}
                      value={days}
                      onChange={(event) => setDays(event.target.value)}
                    />
                  </Label>

                  <div className="moderation-actions">
                    {targetActions.map((action) => {
                      const Icon = actionIcons[action] ?? ShieldCheck;
                      return (
                        <Button
                          key={action}
                          variant="outline"
                          size="sm"
                          className="ghost-button"
                          disabled={act.isPending}
                          onClick={() => void decide(action)}
                        >
                          <Icon size={14} />{t(moderationActionLabels[action])}
                        </Button>
                      );
                    })}
                  </div>
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
