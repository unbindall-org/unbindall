"use client";

import { useMemo, useState } from "react";
import { Check, FileDown, FolderPlus, LoaderCircle, Merge, TriangleAlert } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { CommandDefinition } from "@/features/generator/catalog/commands";
import { normalizeDocument } from "@/features/generator/domain/document";
import { getConfigTypeDefinition } from "@/features/generator/domain/config-types";
import type { ConfigType, GeneratorDocument } from "@/features/generator/domain/types";
import { createGeneratorModules, moduleDocumentItemCount } from "@/features/generator/modules/registry";
import type { WorkspaceProject } from "@/features/workspace/domain/workspace";
import {
  emptySelection,
  mergeDocument,
  selectionIsEmpty,
  type AdoptResolution,
  type AdoptSelection,
} from "../domain/adopt";

export type AdoptFile = { name: string; configType: ConfigType; document: Record<string, unknown>; rawConfig: string };

export type AdoptFullRequest = {
  projectId: string;
  asProject: boolean;
  files: Array<{ name: string; configType: ConfigType; document: GeneratorDocument }>;
};

type Mode = "full" | "parts";

export function AdoptDialog({
  open,
  post,
  files,
  projects,
  mergeTarget,
  catalog,
  pending,
  signedIn,
  onOpenChange,
  onAdoptFull,
  onAdoptParts,
  onDownload,
}: {
  open: boolean;
  post: { id: string; title: string; kind: "config" | "project"; currentVersion: number } | null;
  files: AdoptFile[];
  projects: WorkspaceProject[];
  mergeTarget: { name: string; document: GeneratorDocument } | null;
  catalog: CommandDefinition[];
  pending: boolean;
  signedIn: boolean;
  onOpenChange(open: boolean): void;
  onAdoptFull(request: AdoptFullRequest): void;
  onAdoptParts(document: GeneratorDocument): void;
  onDownload(file: AdoptFile): void;
}) {
  const { t } = useTranslation();
  const [mode, setMode] = useState<Mode>("full");
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "");
  const [asProject, setAsProject] = useState(true);
  const [sourceIndex, setSourceIndex] = useState(0);
  const [selection, setSelection] = useState<AdoptSelection>(emptySelection);
  const [resolutions, setResolutions] = useState<Record<string, AdoptResolution>>({});

  const normalized = useMemo(
    () => files.map((file) => ({
      name: file.name,
      configType: file.configType,
      document: normalizeDocument(file.document, catalog),
    })),
    [catalog, files],
  );

  const source = normalized[sourceIndex] ?? normalized[0];
  const modules = useMemo(() => createGeneratorModules(catalog), [catalog]);
  const availableModules = useMemo(
    () => source ? modules.filter((module) => moduleDocumentItemCount(module, source.document, true) > 0) : [],
    [modules, source],
  );

  const merged = useMemo(() => {
    if (!mergeTarget || !source) return null;
    return mergeDocument(mergeTarget.document, source.document, selection, catalog, resolutions);
  }, [catalog, mergeTarget, resolutions, selection, source]);

  function toggleModule(id: string, kind: string, checked: boolean) {
    setSelection((current) => {
      if (kind === "settings") {
        const categories = new Set(current.commandCategories);
        if (checked) categories.add(id); else categories.delete(id);
        return { ...current, commandCategories: [...categories] };
      }
      if (kind === "standard-binds") return { ...current, standardBinds: checked };
      if (kind === "multi-binds") return { ...current, multiBinds: checked };
      return { ...current, customBinds: checked };
    });
  }

  function isSelected(id: string, kind: string) {
    if (kind === "settings") return selection.commandCategories.includes(id);
    if (kind === "standard-binds") return selection.standardBinds;
    if (kind === "multi-binds") return selection.multiBinds;
    return selection.customBinds;
  }

  function submitFull() {
    if (!projectId && signedIn) return;
    onAdoptFull({
      projectId,
      asProject: post?.kind === "project" && asProject,
      files: normalized,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="adopt-dialog">
        <DialogHeader>
          <DialogTitle>{t("Übernehmen")}</DialogTitle>
          <DialogDescription>{post?.title ?? ""}</DialogDescription>
        </DialogHeader>

        <div className="adopt-modes" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={mode === "full"}
            className={mode === "full" ? "is-active" : ""}
            onClick={() => setMode("full")}
          >
            <FolderPlus size={15} />{t("Komplett übernehmen")}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "parts"}
            className={mode === "parts" ? "is-active" : ""}
            disabled={!mergeTarget}
            onClick={() => setMode("parts")}
          >
            <Merge size={15} />{t("Teile übernehmen")}
          </button>
        </div>

        {mode === "full" ? (
          <div className="adopt-body">
            <ul className="adopt-files">
              {normalized.map((file) => (
                <li key={file.name}>
                  <strong>{file.name}</strong>
                  <span>{t(getConfigTypeDefinition(file.configType).label)}</span>
                  <button
                    type="button"
                    className="ghost-button"
                    onClick={() => onDownload(files[normalized.indexOf(file)])}
                  >
                    <FileDown size={14} />{t("Datei laden")}
                  </button>
                </li>
              ))}
            </ul>

            {post?.kind === "project" && (
              <label className="adopt-toggle">
                <Checkbox checked={asProject} onCheckedChange={(value) => setAsProject(value === true)} />
                <span>{t("Als eigenes Projekt anlegen")}</span>
              </label>
            )}

            {signedIn && !(post?.kind === "project" && asProject) && (
              <Label className="new-config-field">
                <span>{t("ZIELPROJEKT")}</span>
                <Select value={projectId} onValueChange={setProjectId}>
                  <SelectTrigger aria-label={t("Zielprojekt")}>
                    <SelectValue>{projects.find((project) => project.id === projectId)?.name ?? t("Projekt wählen")}</SelectValue>
                  </SelectTrigger>
                  <SelectContent position="popper">
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Label>
            )}

            <p className="compose-hint">
              {signedIn
                ? t("Die Dateien werden als Kopie in deinem Workspace angelegt. Der Originalbeitrag bleibt unverändert.")
                : t("Ohne Anmeldung landen die Dateien in diesem Browser. Melde dich an, um sie im Account zu sichern.")}
            </p>

            <div className="new-config-actions">
              <Button type="button" variant="outline" className="ghost-button" onClick={() => onOpenChange(false)}>
                {t("Abbrechen")}
              </Button>
              <Button type="button" className="primary-button" disabled={pending} onClick={submitFull}>
                {pending && <LoaderCircle className="spin" size={15} />}
                {t("In Workspace übernehmen")}
              </Button>
            </div>
          </div>
        ) : (
          <div className="adopt-body">
            <p className="compose-hint">
              {t("adoptIntoTarget", { name: mergeTarget?.name ?? "" })}
            </p>

            {normalized.length > 1 && (
              <Label className="new-config-field">
                <span>{t("QUELLDATEI")}</span>
                <Select value={String(sourceIndex)} onValueChange={(value) => setSourceIndex(Number(value))}>
                  <SelectTrigger aria-label={t("Quelldatei")}>
                    <SelectValue>{source?.name}</SelectValue>
                  </SelectTrigger>
                  <SelectContent position="popper">
                    {normalized.map((file, index) => (
                      <SelectItem key={file.name} value={String(index)}>{file.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Label>
            )}

            <fieldset className="adopt-parts">
              <legend>{t("WAS ÜBERNEHMEN?")}</legend>
              {availableModules.map((module) => (
                <label key={module.id} className="adopt-part">
                  <Checkbox
                    checked={isSelected(module.id, module.kind)}
                    onCheckedChange={(value) => toggleModule(module.id, module.kind, value === true)}
                  />
                  <span>
                    <strong>{t(module.label)}</strong>
                    <small>{t("countEntries", { count: source ? moduleDocumentItemCount(module, source.document, true) : 0 })}</small>
                  </span>
                </label>
              ))}
              {!availableModules.length && <p className="compose-hint">{t("Diese Datei enthält keine übernehmbaren Teile.")}</p>}
            </fieldset>

            {merged && merged.conflicts.length > 0 && (
              <section className="adopt-conflicts">
                <p className="adopt-conflicts-head">
                  <TriangleAlert size={15} />
                  {t("countConflicts", { count: merged.conflicts.length })}
                </p>
                <ul>
                  {merged.conflicts.map((conflict) => (
                    <li key={conflict.id}>
                      <strong>{t(conflict.label)}</strong>
                      <div className="adopt-conflict-choice">
                        <button
                          type="button"
                          className={resolutions[conflict.id] !== "current" ? "is-active" : ""}
                          onClick={() => setResolutions((current) => ({ ...current, [conflict.id]: "incoming" }))}
                        >
                          {t("Übernehmen")}: {conflict.incoming}
                        </button>
                        <button
                          type="button"
                          className={resolutions[conflict.id] === "current" ? "is-active" : ""}
                          onClick={() => setResolutions((current) => ({ ...current, [conflict.id]: "current" }))}
                        >
                          {t("Behalten")}: {conflict.current}
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {merged && !selectionIsEmpty(selection) && (
              <p className="adopt-summary">
                <Check size={15} />
                {t("adoptSummary", {
                  commands: merged.applied.commands,
                  binds: merged.applied.standardBinds + merged.applied.multiBinds + merged.applied.customBinds,
                })}
              </p>
            )}

            <div className="new-config-actions">
              <Button type="button" variant="outline" className="ghost-button" onClick={() => onOpenChange(false)}>
                {t("Abbrechen")}
              </Button>
              <Button
                type="button"
                className="primary-button"
                disabled={!merged || selectionIsEmpty(selection) || pending}
                onClick={() => merged && onAdoptParts(merged.document)}
              >
                {t("Teile übernehmen")}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
