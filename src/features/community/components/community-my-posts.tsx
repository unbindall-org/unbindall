"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDownToLine, EyeOff, Globe, Heart, Link2, LoaderCircle, PenSquare, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useTRPC } from "@/trpc/client";
import { formatRelativeTime } from "../domain/format";

export function CommunityMyPosts({
  signedIn,
  onOpenPost,
  onOpenNewPost,
  onOpenAuth,
}: {
  signedIn: boolean;
  onOpenPost(slug: string): void;
  onOpenNewPost(): void;
  onOpenAuth(): void;
}) {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage ?? "de";
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const postsQuery = useQuery(trpc.community.myPosts.queryOptions(undefined, { enabled: signedIn, retry: false }));
  const unpublish = useMutation(trpc.community.unpublish.mutationOptions());

  async function withdraw(id: string) {
    try {
      await unpublish.mutateAsync({ id });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: trpc.community.myPosts.queryKey() }),
        queryClient.invalidateQueries({ queryKey: trpc.community.feed.queryKey() }),
      ]);
      toast.success(t("Beitrag zurückgezogen."));
    } catch (error) {
      toast.error(error instanceof Error ? t(error.message) : t("Beitrag konnte nicht zurückgezogen werden."));
    }
  }

  if (!signedIn) {
    return (
      <div className="community">
        <div className="community-inner">
          <div className="empty-state">
            <PenSquare size={26} />
            <h2>{t("Melde dich an")}</h2>
            <p>{t("Deine geteilten Beiträge gehören zu deinem Account.")}</p>
            <Button className="primary-button" onClick={onOpenAuth}>{t("Anmelden")}</Button>
          </div>
        </div>
      </div>
    );
  }

  const posts = postsQuery.data ?? [];

  return (
    <div className="community">
      <div className="community-inner">
        <header className="community-head">
          <div>
            <p className="eyebrow">{t("MEINE BEITRÄGE")}</p>
            <h1>{t("Was du geteilt hast.")}</h1>
            <p className="page-lead">{t("Sichtbarkeit prüfen, Resonanz sehen und Beiträge zurückziehen.")}</p>
          </div>
          <Button className="primary-button" onClick={onOpenNewPost}>
            <PenSquare size={16} />{t("Config teilen")}
          </Button>
        </header>

        {postsQuery.isPending && (
          <p className="role-loading"><LoaderCircle className="spin" size={18} />{t("Beiträge werden geladen …")}</p>
        )}

        {posts.length > 0 && (
          <ul className="my-posts">
            {posts.map((post) => (
              <li key={post.id}>
                <button type="button" className="my-post-main" onClick={() => onOpenPost(post.slug)}>
                  <strong>{post.title}</strong>
                  <small>
                    {post.visibility === "public" ? <Globe size={12} /> : <Link2 size={12} />}
                    {post.status === "published"
                      ? t(post.visibility === "public" ? "Öffentlich" : "Über Link")
                      : post.status === "hidden" ? t("Ausgeblendet") : t("Entfernt")}
                    {" · "}v{post.currentVersion}
                    {" · "}{formatRelativeTime(post.publishedAt ?? post.updatedAt, locale)}
                  </small>
                </button>
                <span className="my-post-stats">
                  <span><Heart size={13} />{post.likeCount}</span>
                  <span><ArrowDownToLine size={13} />{post.adoptCount}</span>
                </span>
                {post.status === "hidden" && <span className="my-post-flag"><EyeOff size={13} />{t("Moderation")}</span>}
                <Button
                  variant="outline"
                  size="sm"
                  className="ghost-button"
                  disabled={unpublish.isPending}
                  onClick={() => void withdraw(post.id)}
                >
                  <Trash2 size={13} />{t("Zurückziehen")}
                </Button>
              </li>
            ))}
          </ul>
        )}

        {!postsQuery.isPending && !posts.length && (
          <div className="empty-state">
            <PenSquare size={26} />
            <h2>{t("Noch nichts geteilt")}</h2>
            <p>{t("Teile deine erste Config — andere suchen genau nach so einem Setup.")}</p>
            <Button className="primary-button" onClick={onOpenNewPost}>{t("Config teilen")}</Button>
          </div>
        )}
      </div>
    </div>
  );
}
