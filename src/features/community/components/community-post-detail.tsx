"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { inferRouterOutputs } from "@trpc/server";
import {
  ArrowDownToLine,
  CircleAlert,
  Compass,
  EyeOff,
  Flag,
  Heart,
  Link2,
  LoaderCircle,
  UserPlus,
  UserCheck,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { getConfigTypeDefinition } from "@/features/generator/domain/config-types";
import { configTypeIcons } from "@/features/shell/components/config-type-icons";
import { useTRPC } from "@/trpc/client";
import type { AppRouter } from "@/trpc/router";
import { formatCount, formatRelativeTime } from "../domain/format";
import { initialsFor } from "../domain/identity";
import { CommentThread } from "./comment-thread";
import type { ReportTarget } from "./report-dialog";

export type PostDetailData = inferRouterOutputs<AppRouter>["community"]["bySlug"];

export function CommunityPostDetail({
  slug,
  initialData,
  signedIn,
  viewerId,
  canComment,
  onBack,
  onOpenProfile,
  onOpenAuth,
  onAdopt,
  onReport,
  onRequireHandle,
}: {
  slug: string;
  initialData: PostDetailData | null;
  signedIn: boolean;
  viewerId: string | null;
  canComment: boolean;
  onBack(): void;
  onOpenProfile(handle: string): void;
  onOpenAuth(): void;
  onAdopt(data: PostDetailData): void;
  onReport(target: ReportTarget): void;
  onRequireHandle(): void;
}) {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage ?? "de";
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);

  const detailQuery = useQuery(trpc.community.bySlug.queryOptions({ slug }, {
    retry: false,
    initialData: initialData ?? undefined,
  }));
  const like = useMutation(trpc.community.like.mutationOptions());
  const unlike = useMutation(trpc.community.unlike.mutationOptions());
  const follow = useMutation(trpc.community.follow.mutationOptions());
  const unfollow = useMutation(trpc.community.unfollow.mutationOptions());

  const data = detailQuery.data;

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: trpc.community.bySlug.queryKey({ slug }) });
  }

  async function toggleLike() {
    if (!signedIn || !data) return onOpenAuth();
    try {
      if (data.viewer.liked) await unlike.mutateAsync({ id: data.post.id });
      else await like.mutateAsync({ id: data.post.id });
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? t(error.message) : t("Aktion fehlgeschlagen."));
    }
  }

  async function toggleFollow() {
    if (!signedIn || !data) return onOpenAuth();
    try {
      if (data.viewer.following) await unfollow.mutateAsync({ handle: data.post.author.handle });
      else await follow.mutateAsync({ handle: data.post.author.handle });
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? t(error.message) : t("Aktion fehlgeschlagen."));
    }
  }

  async function copyLink() {
    await navigator.clipboard.writeText(`${window.location.origin}/community/${slug}`);
    setCopied(true);
    toast.success(t("Link kopiert."));
    window.setTimeout(() => setCopied(false), 1800);
  }

  if (detailQuery.isPending) {
    return (
      <div className="community">
        <div className="community-inner">
          <p className="role-loading" role="status" aria-live="polite">
            <LoaderCircle className="spin" size={18} />{t("Beitrag wird geladen …")}
          </p>
        </div>
      </div>
    );
  }

  if (detailQuery.isError || !data) {
    return (
      <div className="community">
        <div className="community-inner">
          <div className="empty-state" role="alert">
            <CircleAlert size={26} />
            <h2>{t("Beitrag nicht gefunden")}</h2>
            <p>{t("Er wurde zurückgezogen, entfernt oder hat nie existiert.")}</p>
            <Button variant="outline" className="ghost-button" onClick={onBack}>
              <Compass size={15} />{t("Zurück zum Feed")}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const { post, viewer, files, versions } = data;

  return (
    <div className="community">
      <div className="community-inner post-detail">
        {post.status !== "published" && (
          <p className="post-notice" role="status">
            <EyeOff size={15} />
            {post.status === "hidden"
              ? t("Dieser Beitrag ist derzeit ausgeblendet und nur für dich und die Moderation sichtbar.")
              : t("Dieser Beitrag wurde von der Moderation entfernt.")}
          </p>
        )}

        <header className="post-head">
          <div className="post-author">
              <Avatar className="community-avatar">
              {post.author.image && <AvatarImage src={post.author.image} alt="" />}
              <AvatarFallback>{initialsFor(post.author)}</AvatarFallback>
            </Avatar>
            <div>
              <button type="button" className="community-author-link" onClick={() => onOpenProfile(post.author.handle)}>
                {post.author.displayName}
              </button>
              <small>@{post.author.handle} · {formatRelativeTime(post.publishedAt ?? post.updatedAt, locale)}</small>
            </div>
            {!viewer.isAuthor && (
              <Button variant="outline" size="sm" className="ghost-button" onClick={() => void toggleFollow()}>
                {viewer.following ? <UserCheck size={14} /> : <UserPlus size={14} />}
                {viewer.following ? t("Folgt") : t("Folgen")}
              </Button>
            )}
          </div>

          <h1>{post.title}</h1>
          <p className="page-lead">{post.summary}</p>

          {post.tags.length > 0 && (
            <ul className="community-tags">
              {post.tags.map((tag) => <li key={tag}>#{tag}</li>)}
            </ul>
          )}

          <div className="post-actions">
            <Button className="primary-button" onClick={() => onAdopt(data)}>
              <ArrowDownToLine size={16} />{t("Übernehmen")}
            </Button>
            <Button
              variant="outline"
              className={viewer.liked ? "ghost-button is-liked" : "ghost-button"}
              onClick={() => void toggleLike()}
            >
              <Heart size={15} />{formatCount(post.likeCount, locale)}
            </Button>
            <Button variant="outline" className="ghost-button" onClick={() => void copyLink()}>
              <Link2 size={15} />{copied ? t("Kopiert") : t("Link")}
            </Button>
            {signedIn && !viewer.isAuthor && (
              <Button
                variant="outline"
                className="ghost-button"
                onClick={() => onReport({ type: "post", id: post.id, label: post.title })}
              >
                <Flag size={15} />{t("Melden")}
              </Button>
            )}
          </div>

          <p className="post-stats">
            {t("countAdoptions", { count: post.adoptCount })} · {t("countVersions", { count: versions.length })}
          </p>
        </header>

        <section className="post-files">
          <h2 className="section-title">{t("Enthaltene Dateien")}</h2>
          <ul>
            {files.map((file) => {
              const Icon = configTypeIcons[file.configType];
              return (
                <li key={file.name}>
                  <span className="post-file-icon"><Icon size={16} /></span>
                  <div>
                    <strong>{file.name}</strong>
                    <small>{t(getConfigTypeDefinition(file.configType).label)}</small>
                  </div>
                  <span className="post-file-lines">
                    {t("countLines", { count: file.rawConfig.split("\n").length })}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>

        {files[0] && (
          <section className="post-preview">
            <h2 className="section-title">{t("Vorschau")}</h2>
            <pre className="post-code"><code>{files[0].rawConfig.split("\n").slice(0, 40).join("\n")}</code></pre>
            {files[0].rawConfig.split("\n").length > 40 && (
              <p className="compose-hint">{t("Gekürzte Vorschau. Übernimm den Beitrag, um alles zu sehen.")}</p>
            )}
          </section>
        )}

        {versions.length > 1 && (
          <section className="post-versions">
            <h2 className="section-title">{t("Versionen")}</h2>
            <ul>
              {versions.map((version) => (
                <li key={version.version}>
                  <strong>v{version.version}</strong>
                  <span>{version.changelog ?? t("Ohne Beschreibung")}</span>
                  <small>{formatRelativeTime(version.createdAt, locale)}</small>
                </li>
              ))}
            </ul>
          </section>
        )}

        <CommentThread
          postId={post.id}
          signedIn={signedIn}
          viewerId={viewerId}
          canComment={canComment}
          onOpenAuth={onOpenAuth}
          onOpenProfile={onOpenProfile}
          onReport={onReport}
          onRequireHandle={onRequireHandle}
        />
      </div>
    </div>
  );
}
