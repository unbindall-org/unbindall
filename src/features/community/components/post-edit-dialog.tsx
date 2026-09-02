"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { LoaderCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getConfigTypeDefinition } from "@/features/generator/domain/config-types";
import type { WorkspaceFile } from "@/features/workspace/domain/workspace";
import { useTRPC } from "@/trpc/client";
import {
  changelogMaxLength,
  maxTags,
  normalizeTags,
  summaryMaxLength,
  titleMaxLength,
} from "../domain/post";
import type { PublishableFile } from "./community-new-post";

export type EditablePost = {
  id: string;
  kind: "config" | "project";
  title: string;
  summary: string;
  tags: string[];
  visibility: "public" | "unlisted";
  currentVersion: number;
};

/**
 * Title, description and tags are corrections to the same post. New content is
 * a new version instead, so nobody's adopted copy silently changes meaning.
 */
export function PostEditDialog({
  post,
  files,
  onLoadFile,
  onOpenChange,
}: {
  post: EditablePost | null;
  files: WorkspaceFile[];
  onLoadFile(fileId: string): Promise<PublishableFile>;
  onOpenChange(open: boolean): void;
}) {
  const { t } = useTranslation();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState(post?.title ?? "");
  const [summary, setSummary] = useState(post?.summary ?? "");
  const [tags, setTags] = useState(post?.tags.join(", ") ?? "");
  const [visibility, setVisibility] = useState<"public" | "unlisted">(post?.visibility ?? "public");
  const [withVersion, setWithVersion] = useState(false);
  const [fileId, setFileId] = useState(files[0]?.id ?? "");
  const [changelog, setChangelog] = useState("");

  const update = useMutation(trpc.community.updatePost.mutationOptions());
  const publishVersion = useMutation(trpc.community.publishVersion.mutationOptions());
  const pending = update.isPending || publishVersion.isPending;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!post) return;
    try {
      await update.mutateAsync({
        id: post.id,
        title: title.trim(),
        summary: summary.trim(),
        tags: normalizeTags(tags.split(",")),
        visibility,
      });

      if (withVersion && fileId) {
        const file = await onLoadFile(fileId);
        const result = await publishVersion.mutateAsync({
          id: post.id,
          changelog: changelog.trim() || undefined,
          files: [file] as never,
        });
        toast.success(t("versionPublished", { version: result.version }));
      } else {
        toast.success(t("Beitrag aktualisiert."));
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: trpc.community.myPosts.queryKey() }),
        queryClient.invalidateQueries({ queryKey: trpc.community.feed.queryKey() }),
        queryClient.invalidateQueries({ queryKey: trpc.community.bySlug.queryKey() }),
      ]);
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? t(error.message) : t("Beitrag konnte nicht aktualisiert werden."));
    }
  }

  return (
    <Dialog open={Boolean(post)} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("Beitrag bearbeiten")}</DialogTitle>
          <DialogDescription>
            {t("Angaben lassen sich jederzeit korrigieren. Neuer Inhalt wird immer eine neue Version.")}
          </DialogDescription>
        </DialogHeader>

        <form className="compose-form" onSubmit={submit}>
          <Label className="new-config-field">
            <span>{t("TITEL")}</span>
            <Input value={title} maxLength={titleMaxLength} onChange={(event) => setTitle(event.target.value)} />
          </Label>

          <Label className="new-config-field">
            <span>{t("BESCHREIBUNG")}</span>
            <textarea
              className="compose-textarea"
              rows={4}
              value={summary}
              maxLength={summaryMaxLength}
              onChange={(event) => setSummary(event.target.value)}
            />
          </Label>

          <Label className="new-config-field">
            <span>{t("TAGS")}</span>
            <Input value={tags} onChange={(event) => setTags(event.target.value)} />
            <small>{t("commaSeparatedTags", { count: maxTags })}</small>
          </Label>

          <Label className="new-config-field">
            <span>{t("SICHTBARKEIT")}</span>
            <Select value={visibility} onValueChange={(value) => setVisibility(value as "public" | "unlisted")}>
              <SelectTrigger aria-label={t("Sichtbarkeit")}>
                <SelectValue>{t(visibility === "public" ? "Öffentlich" : "Über Link")}</SelectValue>
              </SelectTrigger>
              <SelectContent position="popper">
                <SelectItem value="public">{t("Öffentlich")}</SelectItem>
                <SelectItem value="unlisted">{t("Über Link")}</SelectItem>
              </SelectContent>
            </Select>
          </Label>

          {post?.kind === "config" && files.length > 0 && (
            <>
              <label className="adopt-toggle">
                <Checkbox checked={withVersion} onCheckedChange={(value) => setWithVersion(value === true)} />
                <span>{t("newVersionFrom", { version: (post?.currentVersion ?? 1) + 1 })}</span>
              </label>

              {withVersion && (
                <>
                  <Label className="new-config-field">
                    <span>{t("CONFIG")}</span>
                    <Select value={fileId} onValueChange={setFileId}>
                      <SelectTrigger aria-label={t("Config auswählen")}>
                        <SelectValue>
                          {files.find((file) => file.id === fileId)?.name ?? t("Config wählen")}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent position="popper">
                        {files.map((file) => (
                          <SelectItem key={file.id} value={file.id}>
                            {file.name} · {t(getConfigTypeDefinition(file.configType).label)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Label>

                  <Label className="new-config-field">
                    <span>{t("WAS HAT SICH GEÄNDERT?")}</span>
                    <Input
                      value={changelog}
                      maxLength={changelogMaxLength}
                      placeholder={t("z. B. Crosshair angepasst, Radar größer")}
                      onChange={(event) => setChangelog(event.target.value)}
                    />
                  </Label>
                </>
              )}
            </>
          )}

          <div className="new-config-actions">
            <Button type="button" variant="outline" className="ghost-button" onClick={() => onOpenChange(false)}>
              {t("Abbrechen")}
            </Button>
            <Button type="submit" className="primary-button" disabled={pending || title.trim().length < 3}>
              {pending && <LoaderCircle className="spin" size={15} />}
              {t("Speichern")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
