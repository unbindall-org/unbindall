"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AtSign, LoaderCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTRPC } from "@/trpc/client";
import { displayNameMaxLength, handleMaxLength, handlePattern } from "../domain/identity";

/**
 * Publishing and commenting attach a name to content permanently, so both need
 * a chosen identity first. This is that one-time gate.
 */
export function HandleDialog({
  open,
  currentHandle,
  currentDisplayName,
  canChangeHandle,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  currentHandle: string | null;
  currentDisplayName: string | null;
  canChangeHandle: boolean;
  onOpenChange(open: boolean): void;
  onSaved?(handle: string): void;
}) {
  const { t } = useTranslation();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [handle, setHandle] = useState(currentHandle ?? "");
  const [displayName, setDisplayName] = useState(currentDisplayName ?? "");

  const update = useMutation(trpc.community.updateProfile.mutationOptions());
  const handleLocked = Boolean(currentHandle) && !canChangeHandle;
  const handleValid = handlePattern.test(handle.trim().toLowerCase());
  const canSubmit = handleValid && displayName.trim().length > 0 && !update.isPending;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;
    try {
      const saved = await update.mutateAsync({
        handle: handleLocked ? undefined : handle.trim().toLowerCase(),
        displayName: displayName.trim(),
      });
      await queryClient.invalidateQueries({ queryKey: trpc.community.myProfile.queryKey() });
      toast.success(t("Öffentliches Profil gespeichert."));
      onOpenChange(false);
      if (saved.handle) onSaved?.(saved.handle);
    } catch (error) {
      toast.error(error instanceof Error ? t(error.message) : t("Profil konnte nicht gespeichert werden."));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{currentHandle ? t("Öffentliches Profil") : t("Wähle deinen Handle")}</DialogTitle>
          <DialogDescription>
            {t("Unter diesem Namen erscheinen deine Beiträge und Kommentare. Dein Login-Name bleibt privat.")}
          </DialogDescription>
        </DialogHeader>

        <form className="handle-form" onSubmit={submit}>
          <Label className="new-config-field">
            <span>{t("HANDLE")}</span>
            <div className="handle-input">
              <AtSign size={15} />
              <Input
                value={handle}
                maxLength={handleMaxLength}
                disabled={handleLocked}
                autoComplete="off"
                placeholder="niko_b"
                onChange={(event) => setHandle(event.target.value.toLowerCase())}
              />
            </div>
            <small>
              {handleLocked
                ? t("Ein Handle kann nur alle 30 Tage geändert werden.")
                : t("3 bis 24 Zeichen: Kleinbuchstaben, Ziffern, - und _, beginnend mit einem Buchstaben.")}
            </small>
          </Label>

          <Label className="new-config-field">
            <span>{t("ANZEIGENAME")}</span>
            <Input
              value={displayName}
              maxLength={displayNameMaxLength}
              placeholder={t("Wie du angezeigt werden möchtest")}
              onChange={(event) => setDisplayName(event.target.value)}
            />
          </Label>

          <div className="new-config-actions">
            <Button type="button" variant="outline" className="ghost-button" onClick={() => onOpenChange(false)}>
              {t("Abbrechen")}
            </Button>
            <Button type="submit" className="primary-button" disabled={!canSubmit}>
              {update.isPending && <LoaderCircle className="spin" size={15} />}
              {t("Speichern")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
