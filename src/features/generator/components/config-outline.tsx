"use client";

import { memo, useEffect, useState, type RefObject } from "react";
import { useTranslation } from "react-i18next";
import type { GeneratorModule } from "../modules/registry";
import { generatorModuleIcons } from "./module-icons";

export type OutlineEntry = { module: GeneratorModule; count: number };

/**
 * The document outline. The editor renders one long config document; this is
 * its table of contents, scroll-spied like the header list of a markdown page.
 */
function ConfigOutlineComponent({
  entries,
  scrollRef,
  activeCount,
  totalCount,
}: {
  entries: OutlineEntry[];
  scrollRef: RefObject<HTMLDivElement | null>;
  activeCount: number;
  totalCount: number;
}) {
  const { t } = useTranslation();
  const [activeId, setActiveId] = useState<string | null>(null);
  const ids = entries.map((entry) => entry.module.id).join("|");

  useEffect(() => {
    const root = scrollRef.current;
    if (!root || !ids) return;
    const idList = ids.split("|");
    const sections = idList
      .map((id) => root.querySelector<HTMLElement>(`#section-${id}`))
      .filter((element): element is HTMLElement => Boolean(element));
    if (!sections.length) return;

    // A band near the top of the scrolling document decides which heading counts as current.
    const observer = new IntersectionObserver((records) => {
      const visible = records
        .filter((record) => record.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      if (visible.length) setActiveId(visible[0].target.id.replace("section-", ""));
    }, { root, rootMargin: "-96px 0px -60% 0px", threshold: 0 });

    for (const section of sections) observer.observe(section);

    // The last sections are often shorter than the band, so they would never win
    // on their own — once the document is scrolled out, the final entry is current.
    function onScroll() {
      if (!root) return;
      if (root.scrollTop + root.clientHeight >= root.scrollHeight - 8) {
        setActiveId(idList[idList.length - 1]);
      }
    }
    root.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      observer.disconnect();
      root.removeEventListener("scroll", onScroll);
    };
  }, [ids, scrollRef]);

  function scrollTo(id: string) {
    const target = scrollRef.current?.querySelector<HTMLElement>(`#section-${id}`);
    if (!target) return;
    setActiveId(id);
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  if (!entries.length) return null;

  const progress = totalCount ? Math.round((activeCount / totalCount) * 100) : 0;

  return (
    <nav className="config-outline" aria-label={t("Gliederung dieser Config")}>
      <p className="outline-title">{t("IN DIESER CONFIG")}</p>

      <div className="outline-scroll">
        <ul>
          {entries.map(({ module, count }) => {
            const Icon = generatorModuleIcons[module.id];
            const isActive = activeId === module.id;
            return (
              <li key={module.id}>
                <button
                  type="button"
                  className={isActive ? "is-active" : ""}
                  aria-current={isActive ? "true" : undefined}
                  title={module.label}
                  onClick={() => scrollTo(module.id)}
                >
                  <Icon size={14} />
                  <span>{module.shortLabel}</span>
                  <em>{count}</em>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="outline-foot">
        <div className="outline-meter" aria-hidden="true">
          <span style={{ width: `${progress}%` }} />
        </div>
        <p>{t("outlineSummary", { active: activeCount, total: totalCount })}</p>
      </div>
    </nav>
  );
}

export const ConfigOutline = memo(ConfigOutlineComponent);
