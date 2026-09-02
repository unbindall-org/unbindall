"use client";

import {
  BookOpenCheck,
  CircleAlert,
  Cloud,
  CloudOff,
  Compass,
  FileCode2,
  House,
  Library,
  LoaderCircle,
  PanelLeft,
  PenSquare,
  PlusSquare,
  Settings,
  ShieldCheck,
  ShieldUser,
  Trash2,
  UserRound,
  X,
  type LucideIcon,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useSidebar } from "@/components/ui/sidebar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { SyncState } from "@/features/generator/state/editor-store";
import type { WorkspaceFile, WorkspaceTab } from "@/features/workspace/domain/workspace";
import { configTypeIcons } from "./config-type-icons";

export type TabDescriptor = {
  tab: WorkspaceTab;
  label: string;
  Icon: LucideIcon;
  dirty: boolean;
};

type StaticKind = Exclude<WorkspaceTab["kind"], "config" | "community-detail" | "profile">;

const staticTabs: Record<StaticKind, { label: string; Icon: LucideIcon }> = {
  start: { label: "Start", Icon: House },
  "new-config": { label: "Neue Config", Icon: PlusSquare },
  community: { label: "Entdecken", Icon: Compass },
  "community-post": { label: "Neuer Post", Icon: PenSquare },
  "community-mine": { label: "Meine Beiträge", Icon: Library },
  trash: { label: "Papierkorb", Icon: Trash2 },
  commands: { label: "Command-Register", Icon: BookOpenCheck },
  settings: { label: "Einstellungen", Icon: Settings },
  moderation: { label: "Moderation", Icon: ShieldCheck },
  admin: { label: "Administration", Icon: ShieldUser },
};

export function describeTabs(tabs: WorkspaceTab[], files: Map<string, WorkspaceFile>, dirtyConfigId: string | null) {
  return tabs.map((tab): TabDescriptor => {
    if (tab.kind === "community-detail") return { tab, label: tab.slug.replace(/-[a-z0-9]{6}$/, ""), Icon: Compass, dirty: false };
    if (tab.kind === "profile") return { tab, label: `@${tab.handle}`, Icon: UserRound, dirty: false };
    if (tab.kind !== "config") return { tab, ...staticTabs[tab.kind], dirty: false };
    const file = files.get(tab.configId);
    return {
      tab,
      label: file?.name ?? "Config",
      Icon: file ? configTypeIcons[file.configType] : configTypeIcons.matchmaking,
      dirty: dirtyConfigId === tab.configId,
    };
  });
}

export type OutputTarget = { fileName: string; onOpen(): void };

/**
 * Everything the workspace can show is a tab. The right-hand side carries the
 * two things that only make sense for the file in front of you: where its
 * output goes, and whether it is safe.
 */
export function TabBar({
  tabs,
  activeTabId,
  sync,
  output,
  showPanelToggle,
  onSelect,
  onClose,
}: {
  tabs: TabDescriptor[];
  activeTabId: string | null;
  sync: SyncState | null;
  output: OutputTarget | null;
  showPanelToggle: boolean;
  onSelect(id: string): void;
  onClose(id: string): void;
}) {
  const { t } = useTranslation();
  const { toggleSidebar } = useSidebar();

  return (
    <header className="tab-bar">
      {showPanelToggle && (
        <button type="button" className="tab-bar-toggle" onClick={toggleSidebar} aria-label={t("Seitenleiste umschalten")}>
          <PanelLeft size={15} />
        </button>
      )}

      <div className="tab-strip" role="tablist" aria-label={t("Geöffnete Dateien")}>
        {tabs.map(({ tab, label, Icon, dirty }) => (
          <div
            key={tab.id}
            className={`tab-item${activeTabId === tab.id ? " is-active" : ""}`}
            // Middle-click closes, as in an editor. mousedown only suppresses
            // the browser's autoscroll cursor; auxclick is the actual trigger.
            onMouseDown={(event) => { if (event.button === 1) event.preventDefault(); }}
            onAuxClick={(event) => {
              if (event.button !== 1) return;
              event.preventDefault();
              onClose(tab.id);
            }}
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeTabId === tab.id}
              className="tab-open"
              onClick={() => onSelect(tab.id)}
            >
              <Icon size={13} />
              <span>{label}</span>
            </button>
            <button
              type="button"
              className={`tab-close${dirty ? " is-dirty" : ""}`}
              aria-label={t("tabClose", { name: label })}
              onClick={(event) => { event.stopPropagation(); onClose(tab.id); }}
            >
              <X size={12} />
            </button>
          </div>
        ))}
      </div>

      <div className="tab-bar-end">
        {output && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button type="button" className="output-button" onClick={output.onOpen}>
                <FileCode2 size={13} />
                <span>{output.fileName}</span>
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom">{t("Config-Ausgabe ansehen, kopieren und herunterladen")}</TooltipContent>
          </Tooltip>
        )}
        <SyncIndicator sync={sync} />
      </div>
    </header>
  );
}

function SyncIndicator({ sync }: { sync: SyncState | null }) {
  const { t } = useTranslation();
  if (!sync) return null;
  const state = describeSync(sync, t);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={`sync-mark sync-${state.tone}`}>
          {state.spinning ? <LoaderCircle size={13} className="spin" /> : <state.Icon size={13} />}
          <span>{state.label}</span>
        </span>
      </TooltipTrigger>
      <TooltipContent side="bottom">{state.hint}</TooltipContent>
    </Tooltip>
  );
}

function describeSync(sync: SyncState, t: (key: string) => string) {
  switch (sync.status) {
    case "syncing":
      return { tone: "busy", label: t("Speichert"), hint: t("Änderungen werden in deinen Account geschrieben."), spinning: true, Icon: Cloud };
    case "dirty":
      return { tone: "pending", label: t("Ungespeichert"), hint: t("Autosave läuft gleich."), spinning: false, Icon: Cloud };
    case "saved":
      return { tone: "ok", label: t("Gespeichert"), hint: t("Alle Änderungen liegen in deinem Account."), spinning: false, Icon: Cloud };
    case "offline":
      return { tone: "warn", label: t("Offline"), hint: t("Änderungen sind lokal gesichert und werden nachgeholt."), spinning: false, Icon: CloudOff };
    case "conflict":
      return { tone: "warn", label: t("Konflikt"), hint: t("Auf dem Server liegt ein neuerer Stand."), spinning: false, Icon: CircleAlert };
    case "hydrating":
      return { tone: "busy", label: t("Lädt"), hint: t("Config wird geladen."), spinning: true, Icon: Cloud };
    case "load-error":
      return { tone: "warn", label: t("Ladefehler"), hint: sync.message, spinning: false, Icon: CircleAlert };
    default:
      return { tone: "pending", label: t("Nicht übernommen"), hint: t("Diese Datei liegt noch nicht in deinem Account."), spinning: false, Icon: CloudOff };
  }
}
