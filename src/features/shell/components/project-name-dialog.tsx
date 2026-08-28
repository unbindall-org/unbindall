"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ProjectNameDialog({
  open,
  mode,
  initialName,
  pending,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  mode: "create" | "rename";
  initialName: string;
  pending: boolean;
  onOpenChange(open: boolean): void;
  onSubmit(name: string): void;
}) {
  const { t } = useTranslation();
  const [name, setName] = useState(initialName);

  const [wasOpen, setWasOpen] = useState(false);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setName(initialName);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="project-dialog">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? t("Neues Projekt") : t("Projekt umbenennen")}</DialogTitle>
          <DialogDescription>
            {t("Ein Projekt bündelt zusammengehörige Config-Dateien — zum Beispiel Autoexec, Practice und Server für ein Setup.")}
          </DialogDescription>
        </DialogHeader>
        <form
          className="project-dialog-form"
          onSubmit={(event) => { event.preventDefault(); if (name.trim()) onSubmit(name.trim()); }}
        >
          <Label className="new-config-field">
            <span>{t("NAME")}</span>
            <Input autoFocus value={name} maxLength={60} onChange={(event) => setName(event.target.value)} />
          </Label>
          <div className="new-config-actions">
            <Button type="button" variant="outline" className="ghost-button" onClick={() => onOpenChange(false)}>
              {t("Abbrechen")}
            </Button>
            <Button type="submit" className="primary-button" disabled={pending || !name.trim()}>
              {mode === "create" ? t("Projekt anlegen") : t("Speichern")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
