"use client";

import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Eye, FileCode2, FolderOpen, Globe, Link2, LoaderCircle, TriangleAlert } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getConfigTypeDefinition } from "@/features/generator/domain/config-types";
import { configTypeIcons } from "@/features/shell/components/config-type-icons";
import type { WorkspaceFile, WorkspaceProject } from "@/features/workspace/domain/workspace";
import { useTRPC } from "@/trpc/client";
import {
  maxFilesPerPost,
  maxTags,
  normalizeTags,
  summaryMaxLength,
  titleMaxLength,
} from "../domain/post";

export type PublishableFile = {
  name: string;
  configType: WorkspaceFile["configType"];
  document: unknown;
  rawConfig: string;
};

const visibilities = [
  { id: "public", label: "Öffentlich", description: "Erscheint im Feed und ist über die Suche auffindbar.", Icon: Globe },
  { id: "unlisted", label: "Über Link", description: "Nur wer den Link hat, sieht den Beitrag.", Icon: Link2 },
] as const;

export function CommunityNewPost({
  files,
  projects,
  signedIn,
  hasHandle,
  handle,
  displayName,
  onLoadFile,
  onPublished,
  onOpenAuth,
  onRequireHandle,
}: {
  files: WorkspaceFile[];
  projects: WorkspaceProject[];
  signedIn: boolean;
  hasHandle: boolean;
  handle: string | null;
  displayName: string | null;
  onLoadFile(fileId: string): Promise<PublishableFile>;
  onPublished(slug: string): void;
  onOpenAuth(): void;
  onRequireHandle(): void;
}) {
  const { t } = useTranslation();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [kind, setKind] = useState<"config" | "project">("config");
  const [fileId, setFileId] = useState(files[0]?.id ?? "");
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [tags, setTags] = useState("");
  const [visibility, setVisibility] = useState<"public" | "unlisted">("public");
  const [findings, setFindings] = useState<string[]>([]);

  const publish = useMutation(trpc.community.publish.mutationOptions());

  const file = files.find((item) => item.id === fileId);
  const projectFiles = useMemo(
    () => files.filter((item) => item.projectId === projectId).slice(0, maxFilesPerPost),
    [files, projectId],
  );
  const selected = kind === "config" ? (file ? [file] : []) : projectFiles;
  const tagList = normalizeTags(tags.split(","));
  const previewType = selected[0]?.configType ?? "matchmaking";
  const PreviewIcon = configTypeIcons[previewType];

  const ready = signedIn && selected.length > 0 && title.trim().length >= 3 && summary.trim().length >= 10;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!signedIn) return onOpenAuth();
    if (!hasHandle) return onRequireHandle();
    if (!ready) return;
    setFindings([]);

    try {
      const payload = await Promise.all(selected.map((item) => onLoadFile(item.id)));
      const result = await publish.mutateAsync({
        kind,
        title: title.trim(),
        summary: summary.trim(),
        tags: tagList,
        visibility,
        files: payload as never,
      });
      await queryClient.invalidateQueries({ queryKey: trpc.community.myPosts.queryKey() });
      if (result.findings.length) {
        setFindings(result.findings.map((finding) => finding.message));
        toast.warning(t("Veröffentlicht. Die Moderation prüft den Beitrag zusätzlich."));
      } else {
        toast.success(t("Beitrag veröffentlicht."));
      }
      onPublished(result.slug);
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (message.includes("Handle")) return onRequireHandle();
      toast.error(message ? t(message) : t("Beitrag konnte nicht veröffentlicht werden."));
    }
  }

  return (
    <div className="community">
      <div className="community-inner community-compose">
        <header className="community-head">
          <div>
            <p className="eyebrow">{t("NEUER BEITRAG")}</p>
            <h1>{t("Teile deine Config.")}</h1>
            <p className="page-lead">
              {t("Wähle eine Datei oder ein ganzes Projekt, beschreibe kurz, wofür es gedacht ist, und lege fest, wer es sehen darf.")}
            </p>
          </div>
        </header>

        <div className="compose-layout">
          <form className="compose-form" onSubmit={submit}>
            <fieldset className="kind-group">
              <legend>{t("WAS TEILEN?")}</legend>
              <button
                type="button"
                className={`visibility-card${kind === "config" ? " is-selected" : ""}`}
                aria-pressed={kind === "config"}
                onClick={() => setKind("config")}
              >
                <FileCode2 size={16} />
                <strong>{t("Einzelne Config")}</strong>
                <p>{t("Genau eine Datei aus deinem Workspace.")}</p>
              </button>
              <button
                type="button"
                className={`visibility-card${kind === "project" ? " is-selected" : ""}`}
                aria-pressed={kind === "project"}
                onClick={() => setKind("project")}
              >
                <FolderOpen size={16} />
                <strong>{t("Ganzes Projekt")}</strong>
                <p>{t("Alle Configs eines Setups als zusammengehörige Einheit.")}</p>
              </button>
            </fieldset>

            {kind === "config" ? (
              <Label className="new-config-field">
                <span>{t("CONFIG")}</span>
                {files.length ? (
                  <Select value={fileId} onValueChange={setFileId}>
                    <SelectTrigger aria-label={t("Config auswählen")}>
                      <SelectValue>{file?.name ?? t("Config wählen")}</SelectValue>
                    </SelectTrigger>
                    <SelectContent position="popper">
                      {files.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.name} · {t(getConfigTypeDefinition(item.configType).label)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="compose-hint">{t("Lege zuerst eine Config an, um sie teilen zu können.")}</p>
                )}
              </Label>
            ) : (
              <Label className="new-config-field">
                <span>{t("PROJEKT")}</span>
                <Select value={projectId} onValueChange={setProjectId}>
                  <SelectTrigger aria-label={t("Projekt auswählen")}>
                    <SelectValue>{projects.find((item) => item.id === projectId)?.name ?? t("Projekt wählen")}</SelectValue>
                  </SelectTrigger>
                  <SelectContent position="popper">
                    {projects.map((item) => (
                      <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <small>{t("countSelectedFiles", { count: projectFiles.length })}</small>
              </Label>
            )}

            <Label className="new-config-field">
              <span>{t("TITEL")}</span>
              <Input
                value={title}
                maxLength={titleMaxLength}
                placeholder={t("z. B. Faceit-Autoexec für Hybrid-Aim")}
                onChange={(event) => setTitle(event.target.value)}
              />
            </Label>

            <Label className="new-config-field">
              <span>{t("BESCHREIBUNG")}</span>
              <textarea
                className="compose-textarea"
                value={summary}
                maxLength={summaryMaxLength}
                rows={5}
                placeholder={t("Wofür ist diese Config gedacht? Was ist besonders daran?")}
                onChange={(event) => setSummary(event.target.value)}
              />
              <small>{summary.length}/{summaryMaxLength}</small>
            </Label>

            <Label className="new-config-field">
              <span>{t("TAGS")}</span>
              <Input
                value={tags}
                placeholder={t("crosshair, radar, performance")}
                onChange={(event) => setTags(event.target.value)}
              />
              <small>{t("commaSeparatedTags", { count: maxTags })}</small>
            </Label>

            <fieldset className="visibility-group">
              <legend>{t("SICHTBARKEIT")}</legend>
              {visibilities.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`visibility-card${visibility === item.id ? " is-selected" : ""}`}
                  aria-pressed={visibility === item.id}
                  onClick={() => setVisibility(item.id)}
                >
                  <item.Icon size={16} />
                  <strong>{t(item.label)}</strong>
                  <p>{t(item.description)}</p>
                </button>
              ))}
            </fieldset>

            {findings.length > 0 && (
              <div className="publish-findings" role="status">
                <p><TriangleAlert size={15} />{t("Hinweise zur Prüfung")}</p>
                <ul>{findings.map((finding) => <li key={finding}>{t(finding)}</li>)}</ul>
              </div>
            )}

            <div className="new-config-actions">
              <Button type="submit" className="primary-button" disabled={!ready || publish.isPending}>
                {publish.isPending && <LoaderCircle className="spin" size={15} />}
                {t("Veröffentlichen")}
              </Button>
            </div>
            <p className="compose-hint">
              {t("Veröffentlichte Beiträge sind unveränderliche Kopien. Deine Workspace-Config bleibt davon unberührt.")}
            </p>
          </form>

          <aside className="compose-preview">
            <p className="outline-title"><Eye size={13} />{t("VORSCHAU")}</p>
            <article className="community-card">
              <header>
                <span className="community-avatar">{(displayName ?? handle ?? "DU").slice(0, 2).toUpperCase()}</span>
                <div>
                  <strong>{displayName ?? t("dein Name")}</strong>
                  <small>@{handle ?? t("dein-handle")} · {t("gerade eben")}</small>
                </div>
                <span className="community-type">
                  <PreviewIcon size={13} />
                  {kind === "project"
                    ? t("countFiles", { count: selected.length })
                    : t(getConfigTypeDefinition(previewType).label)}
                </span>
              </header>
              <h2>{title.trim() || t("Titel deines Beitrags")}</h2>
              <p>{summary.trim() || t("Deine Beschreibung erscheint hier.")}</p>
              <ul className="community-tags">
                {(tagList.length ? tagList : ["tag"]).map((tag) => <li key={tag}>#{tag}</li>)}
              </ul>
            </article>
          </aside>
        </div>
      </div>
    </div>
  );
}
