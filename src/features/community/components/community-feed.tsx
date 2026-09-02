"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Compass, LoaderCircle, PenSquare, Search, TrendingUp } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getConfigTypeDefinition } from "@/features/generator/domain/config-types";
import { CONFIG_TYPES, type ConfigType } from "@/features/generator/domain/types";
import { useTRPC } from "@/trpc/client";
import type { FeedScope } from "../domain/post";
import { PostCard } from "./post-card";

const scopes: Array<{ id: FeedScope; label: string; signedInOnly?: boolean }> = [
  { id: "new", label: "Neu" },
  { id: "trending", label: "Beliebt" },
  { id: "top", label: "Meist übernommen" },
  { id: "following", label: "Folge ich", signedInOnly: true },
];

export function CommunityFeed({
  signedIn,
  onOpenNewPost,
  onOpenPost,
  onOpenProfile,
  onOpenAuth,
}: {
  signedIn: boolean;
  onOpenNewPost(): void;
  onOpenPost(slug: string): void;
  onOpenProfile(handle: string): void;
  onOpenAuth(): void;
}) {
  const { t } = useTranslation();
  const trpc = useTRPC();
  const [scope, setScope] = useState<FeedScope>("new");
  const [configType, setConfigType] = useState<ConfigType | null>(null);
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState("");

  const feedQuery = useQuery(trpc.community.feed.queryOptions({
    scope,
    configType: configType ?? undefined,
    query: submitted || undefined,
    cursor: 0,
  }, { retry: false }));

  const posts = feedQuery.data?.items ?? [];
  const visibleScopes = scopes.filter((item) => !item.signedInOnly || signedIn);

  return (
    <div className="community">
      <div className="community-inner">
        <header className="community-head">
          <div>
            <p className="eyebrow">{t("COMMUNITY")}</p>
            <h1>{t("Configs, die andere wirklich spielen.")}</h1>
            <p className="page-lead">
              {t("Durchsuche geteilte Setups, übernimm einzelne Parts in dein Projekt oder teile deine eigene Config.")}
            </p>
          </div>
          <Button
            className="primary-button"
            onClick={() => signedIn ? onOpenNewPost() : onOpenAuth()}
          >
            <PenSquare size={16} />{t("Config teilen")}
          </Button>
        </header>

        <div className="community-toolbar">
          <form
            className="search-wrap"
            onSubmit={(event) => { event.preventDefault(); setSubmitted(query.trim()); }}
          >
            <Search size={17} />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("Setup, Spieler oder Tag suchen …")}
              aria-label={t("Community durchsuchen")}
            />
          </form>
          <div className="community-filters">
            {visibleScopes.map((item) => (
              <button
                key={item.id}
                type="button"
                className={scope === item.id ? "is-active" : ""}
                onClick={() => setScope(item.id)}
              >{t(item.label)}</button>
            ))}
          </div>
        </div>

        <div className="community-types">
          <button
            type="button"
            className={configType === null ? "is-active" : ""}
            onClick={() => setConfigType(null)}
          >{t("Alle Typen")}</button>
          {CONFIG_TYPES.map((type) => (
            <button
              key={type}
              type="button"
              className={configType === type ? "is-active" : ""}
              onClick={() => setConfigType(configType === type ? null : type)}
            >{t(getConfigTypeDefinition(type).label)}</button>
          ))}
        </div>

        {feedQuery.isPending && (
          <p className="role-loading" role="status" aria-live="polite">
            <LoaderCircle className="spin" size={18} />{t("Beiträge werden geladen …")}
          </p>
        )}

        {feedQuery.isError && (
          <div className="empty-state compact" role="alert">
            <Compass size={26} />
            <h2>{t("Der Feed konnte nicht geladen werden.")}</h2>
            <p>{t(feedQuery.error.message)}</p>
            <button type="button" className="ghost-button" onClick={() => void feedQuery.refetch()}>
              {t("Erneut versuchen")}
            </button>
          </div>
        )}

        {posts.length > 0 && (
          <div className="community-grid">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} onOpen={onOpenPost} onOpenAuthor={onOpenProfile} />
            ))}
          </div>
        )}

        {!feedQuery.isPending && !feedQuery.isError && !posts.length && (
          <div className="empty-state">
            {scope === "following" ? <TrendingUp size={26} /> : <Search size={26} />}
            <h2>{scope === "following" ? t("Du folgst noch niemandem.") : t("Nichts gefunden")}</h2>
            <p>
              {scope === "following"
                ? t("Folge Spielern, deren Setups dich interessieren — ihre neuen Beiträge landen dann hier.")
                : t("Versuche einen anderen Suchbegriff oder teile die erste Config.")}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
