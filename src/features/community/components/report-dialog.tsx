"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Flag, LoaderCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useTRPC } from "@/trpc/client";
import {
  reportNoteMaxLength,
  reportReasonLabels,
  reportReasons,
  type ReportReason,
  type ReportTargetType,
} from "../domain/moderation";

export type ReportTarget = { type: ReportTargetType; id: string; label: string };

export function ReportDialog({
  target,
  onOpenChange,
}: {
  target: ReportTarget | null;
  onOpenChange(open: boolean): void;
}) {
  const { t } = useTranslation();
  const trpc = useTRPC();
  const [reason, setReason] = useState<ReportReason>("spam");
  const [note, setNote] = useState("");
  const report = useMutation(trpc.community.report.mutationOptions());

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!target) return;
    try {
      const result = await report.mutateAsync({
        targetType: target.type,
        targetId: target.id,
        reason,
        note: note.trim() || undefined,
      });
      toast.success(result.duplicate
        ? t("Du hast diesen Inhalt bereits gemeldet.")
        : t("Danke. Die Meldung liegt jetzt bei der Moderation."));
      setNote("");
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? t(error.message) : t("Meldung konnte nicht gesendet werden."));
    }
  }

  return (
    <Dialog open={Boolean(target)} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle><Flag size={16} />{t("Inhalt melden")}</DialogTitle>
          <DialogDescription>
            {target ? t("reportTargetLabel", { label: target.label }) : ""}
          </DialogDescription>
        </DialogHeader>

        <form className="report-form" onSubmit={submit}>
          <fieldset className="report-reasons">
            <legend>{t("GRUND")}</legend>
            {reportReasons.map((item) => (
              <label key={item} className={`report-reason${reason === item ? " is-selected" : ""}`}>
                <input
                  type="radio"
                  name="report-reason"
                  value={item}
                  checked={reason === item}
                  onChange={() => setReason(item)}
                />
                <span>{t(reportReasonLabels[item])}</span>
              </label>
            ))}
          </fieldset>

          <Label className="new-config-field">
            <span>{t("WAS IST PASSIERT? (OPTIONAL)")}</span>
            <textarea
              className="compose-textarea"
              rows={4}
              value={note}
              maxLength={reportNoteMaxLength}
              placeholder={t("Hilf der Moderation mit einem Satz Kontext.")}
              onChange={(event) => setNote(event.target.value)}
            />
          </Label>

          <div className="new-config-actions">
            <Button type="button" variant="outline" className="ghost-button" onClick={() => onOpenChange(false)}>
              {t("Abbrechen")}
            </Button>
            <Button type="submit" className="primary-button" disabled={report.isPending}>
              {report.isPending && <LoaderCircle className="spin" size={15} />}
              {t("Melden")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
