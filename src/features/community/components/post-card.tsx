"use client";

import { ArrowDownToLine, Heart, MessageSquare } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getConfigTypeDefinition } from "@/features/generator/domain/config-types";
import type { ConfigType } from "@/features/generator/domain/types";
import { configTypeIcons } from "@/features/shell/components/config-type-icons";
import { initialsFor, type PublicAuthor } from "../domain/identity";
import { formatCount, formatRelativeTime } from "../domain/format";

export type FeedPost = {
  id: string;
  kind: "config" | "project";
  slug: string;
  title: string;
  summary: string;
  tags: string[];
  configTypes: ConfigType[];
  status: string;
  visibility: string;
  likeCount: number;
  adoptCount: number;
  commentCount: number;
  publishedAt: string | null;
  updatedAt: string;
  author: PublicAuthor;
};

export function PostCard({
  post,
  onOpen,
  onOpenAuthor,
}: {
  post: FeedPost;
  onOpen(slug: string): void;
  onOpenAuthor?(handle: string): void;
}) {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage ?? "de";
  const primaryType = post.configTypes[0] ?? "matchmaking";
  const Icon = configTypeIcons[primaryType];
  const definition = getConfigTypeDefinition(primaryType);

  return (
    <article className="community-card">
      <header>
        <Avatar className="community-avatar">
          {post.author.image && <AvatarImage src={post.author.image} alt="" />}
          <AvatarFallback>{initialsFor(post.author)}</AvatarFallback>
        </Avatar>
        <div>
          {onOpenAuthor ? (
            <button type="button" className="community-author-link" onClick={() => onOpenAuthor(post.author.handle)}>
              {post.author.displayName}
            </button>
          ) : <strong>{post.author.displayName}</strong>}
          <small>
            @{post.author.handle} · {formatRelativeTime(post.publishedAt ?? post.updatedAt, locale)}
          </small>
        </div>
        <span className="community-type">
          <Icon size={13} />
          {post.kind === "project"
            ? t("countFiles", { count: post.configTypes.length })
            : t(definition.label)}
        </span>
      </header>

      <button type="button" className="community-card-body" onClick={() => onOpen(post.slug)}>
        <h2>{post.title}</h2>
        <p>{post.summary}</p>
      </button>

      {post.tags.length > 0 && (
        <ul className="community-tags">
          {post.tags.map((tag) => <li key={tag}>#{tag}</li>)}
        </ul>
      )}

      <footer>
        <span><Heart size={14} />{formatCount(post.likeCount, locale)}</span>
        <span><ArrowDownToLine size={14} />{formatCount(post.adoptCount, locale)}</span>
        <span><MessageSquare size={14} />{formatCount(post.commentCount, locale)}</span>
        <button type="button" className="ghost-button community-open" onClick={() => onOpen(post.slug)}>
          {t("Ansehen")}
        </button>
      </footer>
    </article>
  );
}
