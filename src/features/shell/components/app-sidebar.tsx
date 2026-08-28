"use client";

import type { Session } from "next-auth";
import {
  BookOpenCheck,
  ChevronRight,
  FilePlus2,
  FolderPlus,
  History,
  Import,
  MoreHorizontal,
  PenSquare,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sidebar, SidebarContent } from "@/components/ui/sidebar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { getConfigTypeDefinition } from "@/features/generator/domain/config-types";
import type { WorkspaceFile, WorkspaceTree } from "@/features/workspace/domain/workspace";
import { configTypeIcons } from "./config-type-icons";

type Props = {
  user: Session["user"] | null;
  tree: WorkspaceTree;
  localFiles: WorkspaceFile[];
  activeConfigId: string | null;
  activeTabId: string | null;
  dirtyConfigId: string | null;
  loading: boolean;
  transferPending: boolean;
  onOpenFile(file: WorkspaceFile): void;
  onNewConfig(projectId?: string): void;
  onNewProject(): void;
  onRenameProject(projectId: string): void;
  onDeleteProject(projectId: string): void;
  onDeleteFile(file: WorkspaceFile): void;
  onOpenHistory(file: WorkspaceFile): void;
  onTransferLocal(): void;
  onOpenTrash(): void;
  onOpenCommands(): void;
  onImport(): void;
};

export function AppSidebar(props: Props) {
  const { t } = useTranslation();

  return (
    <Sidebar variant="sidebar" collapsible="offcanvas" className="app-sidebar">
      <div className="panel-head">
        <span>{t("EXPLORER")}</span>
        <div className="panel-head-actions">
          <IconAction label={t("Neue Config")} onClick={() => props.onNewConfig()}><FilePlus2 size={14} /></IconAction>
          <IconAction label={t("Neues Projekt")} onClick={props.onNewProject}><FolderPlus size={14} /></IconAction>
          <IconAction label={t("Config importieren")} onClick={props.onImport}><Import size={14} /></IconAction>
        </div>
      </div>

      <SidebarContent className="panel-body"><ExplorerPanel {...props} /></SidebarContent>
    </Sidebar>
  );
}

function IconAction({ label, onClick, children }: { label: string; onClick(): void; children: React.ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button type="button" className="icon-action" aria-label={label} onClick={onClick}>{children}</button>
      </TooltipTrigger>
      <TooltipContent side="bottom">{label}</TooltipContent>
    </Tooltip>
  );
}

function ExplorerPanel({
  tree,
  localFiles,
  activeConfigId,
  dirtyConfigId,
  loading,
  transferPending,
  user,
  onOpenFile,
  onNewConfig,
  onRenameProject,
  onDeleteProject,
  onDeleteFile,
  onOpenHistory,
  onTransferLocal,
  onOpenTrash,
  onOpenCommands,
}: Props) {
  const { t } = useTranslation();
  const fileCount = tree.reduce((sum, project) => sum + project.files.length, 0);

  function FileRow({ file }: { file: WorkspaceFile }) {
    const Icon = configTypeIcons[file.configType];
    const definition = getConfigTypeDefinition(file.configType);
    return (
      <li className={`tree-file${activeConfigId === file.id ? " is-active" : ""}`}>
        <button type="button" className="tree-row" onClick={() => onOpenFile(file)}>
          <Icon size={14} />
          <span>{file.name}</span>
          {dirtyConfigId === file.id && <em className="tree-dirty" aria-label={t("Ungespeichert")} />}
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" className="tree-more" aria-label={t("Datei-Aktionen")}><MoreHorizontal size={14} /></button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" side="right">
            <DropdownMenuLabel>{t(definition.label)} · {definition.fileName}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {file.origin === "cloud" && (
              <DropdownMenuItem onClick={() => onOpenHistory(file)}><History />{t("Versionsverlauf")}</DropdownMenuItem>
            )}
            <DropdownMenuItem variant="destructive" onClick={() => onDeleteFile(file)}><Trash2 />{t("Löschen")}</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </li>
    );
  }

  return (
    <>
      {localFiles.length > 0 && user && (
        <section className="local-shelf">
          <p className="local-shelf-head">{t("NUR IN DIESEM BROWSER")}</p>
          <ul className="tree">{localFiles.map((file) => <FileRow key={file.id} file={file} />)}</ul>
          <button type="button" className="local-shelf-action" disabled={transferPending} onClick={onTransferLocal}>
            <UploadCloud size={14} />{t("localTransfer", { count: localFiles.length })}
          </button>
        </section>
      )}

      <ul className="tree">
        {tree.map((project) => (
          <Collapsible key={project.id} defaultOpen asChild>
            <li className="tree-project">
              <div className="tree-project-head">
                <CollapsibleTrigger asChild>
                  <button type="button" className="tree-row is-folder">
                    <ChevronRight size={14} className="tree-chevron" />
                    <span>{project.name}</span>
                  </button>
                </CollapsibleTrigger>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button type="button" className="tree-more" aria-label={t("Projekt-Aktionen")}><MoreHorizontal size={14} /></button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" side="right">
                    <DropdownMenuItem onClick={() => onNewConfig(project.id)}><FilePlus2 />{t("Neue Config hier")}</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onRenameProject(project.id)}><PenSquare />{t("Umbenennen")}</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem variant="destructive" disabled={tree.length <= 1} onClick={() => onDeleteProject(project.id)}>
                      <Trash2 />{t("Projekt löschen")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <CollapsibleContent>
                <ul className="tree tree-nested">
                  {project.files.map((file) => <FileRow key={file.id} file={file} />)}
                  {!project.files.length && (
                    <li className="tree-empty">
                      <button type="button" onClick={() => onNewConfig(project.id)}>{t("Erste Config anlegen")}</button>
                    </li>
                  )}
                </ul>
              </CollapsibleContent>
            </li>
          </Collapsible>
        ))}
      </ul>

      {loading && <p className="panel-hint">{t("Configs werden geladen …")}</p>}
      {!loading && !fileCount && !localFiles.length && (
        <p className="panel-hint">{t("Noch keine Config. Leg oben eine an oder importiere eine bestehende CFG.")}</p>
      )}

      <div className="panel-links">
        <button type="button" onClick={onOpenCommands}><BookOpenCheck size={13} />{t("Command-Register")}</button>
        {user && <button type="button" onClick={onOpenTrash}><Trash2 size={13} />{t("Papierkorb")}</button>}
      </div>
    </>
  );
}
