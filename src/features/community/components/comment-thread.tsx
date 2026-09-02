"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Flag, LoaderCircle, MessageSquare, Reply, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useTRPC } from "@/trpc/client";
import { commentMaxLength } from "../domain/post";
import { formatRelativeTime } from "../domain/format";
import { initialsFor } from "../domain/identity";
import type { ReportTarget } from "./report-dialog";

type Comment = {
  id: string;
  parentId: string | null;
  body: string;
  status: "visible" | "hidden" | "removed";
  createdAt: string;
  editedAt: string | null;
  authorId: string;
  author: { handle: string; displayName: string; image: string | null };
};

export function CommentThread({
  postId,
  signedIn,
  viewerId,
  canComment,
  onOpenAuth,
  onOpenProfile,
  onReport,
  onRequireHandle,
}: {
  postId: string;
  signedIn: boolean;
  viewerId: string | null;
  canComment: boolean;
  onOpenAuth(): void;
  onOpenProfile(handle: string): void;
  onReport(target: ReportTarget): void;
  onRequireHandle(): void;
}) {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage ?? "de";
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [body, setBody] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState("");

  const commentsQuery = useQuery(trpc.community.comments.queryOptions({ postId }, { retry: false }));
  const addComment = useMutation(trpc.community.addComment.mutationOptions());
  const deleteComment = useMutation(trpc.community.deleteComment.mutationOptions());

  const comments = (commentsQuery.data ?? []) as Comment[];
  const roots = comments.filter((comment) => !comment.parentId || !comments.some((item) => item.id === comment.parentId));
  const repliesOf = (id: string) => comments.filter((comment) => comment.parentId === id);

  async function refresh() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: trpc.community.comments.queryKey({ postId }) }),
      queryClient.invalidateQueries({ queryKey: trpc.community.bySlug.queryKey() }),
    ]);
  }

  async function submit(text: string, parentId?: string) {
    if (!signedIn) return onOpenAuth();
    if (!canComment) return onRequireHandle();
    const trimmed = text.trim();
    if (!trimmed) return;
    try {
      await addComment.mutateAsync({ postId, parentId, body: trimmed });
      setBody("");
      setReplyBody("");
      setReplyTo(null);
      await refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (message.includes("Handle")) return onRequireHandle();
      toast.error(message ? t(message) : t("Kommentar konnte nicht gespeichert werden."));
    }
  }

  async function remove(id: string) {
    try {
      await deleteComment.mutateAsync({ id });
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? t(error.message) : t("Kommentar konnte nicht gelöscht werden."));
    }
  }

  function renderComment(comment: Comment, isReply: boolean) {
    const removed = comment.status !== "visible";
    return (
      <li key={comment.id} className={isReply ? "comment is-reply" : "comment"}>
        <div className="comment-head">
          <Avatar className="community-avatar small">
            {comment.author.image && <AvatarImage src={comment.author.image} alt="" />}
            <AvatarFallback>{initialsFor(comment.author)}</AvatarFallback>
          </Avatar>
          <button type="button" className="community-author-link" onClick={() => onOpenProfile(comment.author.handle)}>
            {comment.author.displayName}
          </button>
          <small>{formatRelativeTime(comment.createdAt, locale)}{comment.editedAt ? ` · ${t("bearbeitet")}` : ""}</small>
        </div>

        <p className={removed ? "comment-body is-removed" : "comment-body"}>
          {removed
            ? (comment.status === "hidden" ? t("Von der Moderation ausgeblendet.") : t("Gelöscht."))
            : comment.body}
        </p>

        {!removed && (
          <div className="comment-actions">
            {!isReply && (
              <button type="button" onClick={() => setReplyTo(replyTo === comment.id ? null : comment.id)}>
                <Reply size={13} />{t("Antworten")}
              </button>
            )}
            {viewerId === comment.authorId ? (
              <button type="button" onClick={() => void remove(comment.id)}>
                <Trash2 size={13} />{t("Löschen")}
              </button>
            ) : signedIn && (
              <button
                type="button"
                onClick={() => onReport({ type: "comment", id: comment.id, label: comment.body.slice(0, 60) })}
              >
                <Flag size={13} />{t("Melden")}
              </button>
            )}
          </div>
        )}

        {replyTo === comment.id && (
          <form
            className="comment-form is-reply"
            onSubmit={(event) => { event.preventDefault(); void submit(replyBody, comment.id); }}
          >
            <textarea
              className="compose-textarea"
              rows={3}
              value={replyBody}
              maxLength={commentMaxLength}
              placeholder={t("Antwort schreiben …")}
              onChange={(event) => setReplyBody(event.target.value)}
            />
            <Button type="submit" size="sm" className="primary-button" disabled={addComment.isPending}>
              {t("Antworten")}
            </Button>
          </form>
        )}

        {!isReply && repliesOf(comment.id).length > 0 && (
          <ul className="comment-replies">
            {repliesOf(comment.id).map((reply) => renderComment(reply, true))}
          </ul>
        )}
      </li>
    );
  }

  return (
    <section className="comments">
      <h2 className="section-title">
        <MessageSquare size={15} />
        {t("countComments", { count: comments.filter((comment) => comment.status === "visible").length })}
      </h2>

      <form className="comment-form" onSubmit={(event) => { event.preventDefault(); void submit(body); }}>
        <textarea
          className="compose-textarea"
          rows={3}
          value={body}
          maxLength={commentMaxLength}
          placeholder={signedIn ? t("Frag nach, ergänze etwas, teile deine Erfahrung …") : t("Melde dich an, um mitzureden.")}
          disabled={!signedIn}
          onChange={(event) => setBody(event.target.value)}
        />
        {signedIn ? (
          <Button type="submit" className="primary-button" disabled={!body.trim() || addComment.isPending}>
            {addComment.isPending && <LoaderCircle className="spin" size={15} />}
            {t("Kommentieren")}
          </Button>
        ) : (
          <Button type="button" className="primary-button" onClick={onOpenAuth}>{t("Anmelden")}</Button>
        )}
      </form>

      {commentsQuery.isPending && (
        <p className="role-loading"><LoaderCircle className="spin" size={16} />{t("Kommentare werden geladen …")}</p>
      )}

      <ul className="comment-list">{roots.map((comment) => renderComment(comment, false))}</ul>

      {!commentsQuery.isPending && !comments.length && (
        <p className="compose-hint">{t("Noch keine Kommentare. Schreib den ersten.")}</p>
      )}
    </section>
  );
}
