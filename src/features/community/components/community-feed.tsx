"use client";

import { useState } from "react";
import { ArrowDownToLine, Heart, MessageSquare, PenSquare, Search, TrendingUp } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getConfigTypeDefinition } from "@/features/generator/domain/config-types";
import { configTypeIcons } from "@/features/shell/components/config-type-icons";
import { communityFilters, mockPosts } from "../data/mock-posts";

/** Mock shell. Every number and post here is placeholder content. */
export function CommunityFeed({ onOpenNewPost }: { onOpenNewPost(): void }) {
  const { t } = useTranslation();
  const [filter, setFilter] = useState<string>(communityFilters[0]);
  const [query, setQuery] = useState("");

  const posts = mockPosts.filter((post) =>
    !query.trim() || `${post.title} ${post.summary} ${post.author} ${post.tags.join(" ")}`
      .toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <div className="community">
      <div className="community-inner">
        <span className="mock-badge"><TrendingUp size={13} />{t("Vorschau — noch ohne echte Daten")}</span>

        <header className="community-head">
          <div>
            <p className="eyebrow">{t("COMMUNITY")}</p>
            <h1>{t("Configs, die andere wirklich spielen.")}</h1>
            <p className="page-lead">
              {t("Durchsuche geteilte Setups, übernimm einzelne Parts in dein Projekt oder teile deine eigene Config.")}
            </p>
          </div>
          <Button className="primary-button" onClick={onOpenNewPost}><PenSquare size={16} />{t("Config teilen")}</Button>
        </header>

        <div className="community-toolbar">
          <div className="search-wrap">
            <Search size={17} />
            <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("Setup, Spieler oder Tag suchen …")} />
          </div>
          <div className="community-filters">
            {communityFilters.map((item) => (
              <button
                key={item}
                type="button"
                className={filter === item ? "is-active" : ""}
                onClick={() => setFilter(item)}
              >{t(item)}</button>
            ))}
          </div>
        </div>

        <div className="community-grid">
          {posts.map((post) => {
            const definition = getConfigTypeDefinition(post.configType);
            const Icon = configTypeIcons[post.configType];
            return (
              <article className="community-card" key={post.id}>
                <header>
                  <span className="community-avatar">{post.author.slice(0, 2).toUpperCase()}</span>
                  <div>
                    <strong>{post.author}</strong>
                    <small>{post.authorRank} · {post.postedAt}</small>
                  </div>
                  <span className="community-type"><Icon size={13} />{t(definition.label)}</span>
                </header>
                <h2>{post.title}</h2>
                <p>{post.summary}</p>
                <ul className="community-tags">
                  {post.tags.map((tag) => <li key={tag}>#{tag}</li>)}
                </ul>
                <footer>
                  <span><Heart size={14} />{post.likes.toLocaleString("de-DE")}</span>
                  <span><ArrowDownToLine size={14} />{post.downloads.toLocaleString("de-DE")}</span>
                  <span><MessageSquare size={14} />{post.comments}</span>
                  <Button variant="outline" size="sm" className="ghost-button" disabled>{t("Übernehmen")}</Button>
                </footer>
              </article>
            );
          })}
        </div>

        {!posts.length && (
          <div className="empty-state">
            <Search size={26} />
            <h2>{t("Nichts gefunden")}</h2>
            <p>{t("Versuche einen anderen Suchbegriff.")}</p>
          </div>
        )}
      </div>
    </div>
  );
}
