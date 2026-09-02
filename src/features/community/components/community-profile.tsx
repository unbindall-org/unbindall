"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CircleAlert, LoaderCircle, UserCheck, UserPlus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useTRPC } from "@/trpc/client";
import { formatRelativeTime } from "../domain/format";
import { initialsFor } from "../domain/identity";
import { PostCard } from "./post-card";

export function CommunityProfile({
  handle,
  signedIn,
  onOpenPost,
  onOpenProfile,
  onOpenAuth,
  onEditProfile,
}: {
  handle: string;
  signedIn: boolean;
  onOpenPost(slug: string): void;
  onOpenProfile(handle: string): void;
  onOpenAuth(): void;
  onEditProfile(): void;
}) {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage ?? "de";
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const profileQuery = useQuery(trpc.community.profile.queryOptions({ handle }, { retry: false }));
  const follow = useMutation(trpc.community.follow.mutationOptions());
  const unfollow = useMutation(trpc.community.unfollow.mutationOptions());

  async function toggleFollow() {
    if (!signedIn) return onOpenAuth();
    try {
      if (profileQuery.data?.isFollowing) await unfollow.mutateAsync({ handle });
      else await follow.mutateAsync({ handle });
      await queryClient.invalidateQueries({ queryKey: trpc.community.profile.queryKey({ handle }) });
    } catch (error) {
      toast.error(error instanceof Error ? t(error.message) : t("Aktion fehlgeschlagen."));
    }
  }

  if (profileQuery.isPending) {
    return (
      <div className="community">
        <div className="community-inner">
          <p className="role-loading" role="status" aria-live="polite">
            <LoaderCircle className="spin" size={18} />{t("Profil wird geladen …")}
          </p>
        </div>
      </div>
    );
  }

  if (profileQuery.isError || !profileQuery.data) {
    return (
      <div className="community">
        <div className="community-inner">
          <div className="empty-state" role="alert">
            <CircleAlert size={26} />
            <h2>{t("Profil nicht gefunden")}</h2>
            <p>{t("Diesen Handle gibt es nicht (mehr).")}</p>
          </div>
        </div>
      </div>
    );
  }

  const profile = profileQuery.data;

  return (
    <div className="community">
      <div className="community-inner">
        <header className="profile-head">
          <Avatar className="profile-avatar">
            {profile.author.image && <AvatarImage src={profile.author.image} alt="" />}
            <AvatarFallback>{initialsFor(profile.author)}</AvatarFallback>
          </Avatar>
          <div>
            <h1>{profile.author.displayName}</h1>
            <p className="profile-handle">@{profile.author.handle}</p>
            <p className="profile-meta">
              {t("countPosts", { count: profile.posts.length })} ·{" "}
              {t("countFollowers", { count: profile.followerCount })} ·{" "}
              {t("memberSince", { date: formatRelativeTime(profile.memberSince, locale) })}
            </p>
          </div>
          {profile.isSelf ? (
            <Button variant="outline" className="ghost-button" onClick={onEditProfile}>
              {t("Profil bearbeiten")}
            </Button>
          ) : (
            <Button variant="outline" className="ghost-button" onClick={() => void toggleFollow()}>
              {profile.isFollowing ? <UserCheck size={15} /> : <UserPlus size={15} />}
              {profile.isFollowing ? t("Folgt") : t("Folgen")}
            </Button>
          )}
        </header>

        {profile.posts.length ? (
          <div className="community-grid">
            {profile.posts.map((post) => (
              <PostCard key={post.id} post={post} onOpen={onOpenPost} onOpenAuthor={onOpenProfile} />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <CircleAlert size={26} />
            <h2>{t("Noch nichts geteilt")}</h2>
            <p>{t("Dieses Profil hat bisher keinen öffentlichen Beitrag.")}</p>
          </div>
        )}
      </div>
    </div>
  );
}
