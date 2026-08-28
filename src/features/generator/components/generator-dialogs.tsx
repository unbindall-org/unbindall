"use client";

import type { FormEvent } from "react";
import type { Session } from "next-auth";
import { Clipboard, Cloud, FileCode2, History, LoaderCircle, Save, Trash2, Undo2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { AccountDialog } from "@/features/auth/components/account-dialog";
import { AuthDialog } from "@/features/auth/components/auth-dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AuthProviders } from "./generator-app";

export type SavedConfigView = {
  id: string;
  name: string;
  revision: number;
  updatedAt: string;
};

export type TrashedConfigView = SavedConfigView & { deletedAt: string | null };
export type RevisionView = {
  revision: number;
  kind: string;
  label: string | null;
  createdAt: string;
};

type Props = {
  user: Session["user"] | null;
  authProviders: AuthProviders;
  authOpen: boolean;
  accountOpen: boolean;
  saveOpen: boolean;
  libraryOpen: boolean;
  currentId: string | null;
  configName: string;
  enabledCount: number;
  lineCount: number;
  syncStatus: string;
  configs: SavedConfigView[];
  configsFetching: boolean;
  trash: TrashedConfigView[];
  historyConfig: SavedConfigView | null;
  historyItems: RevisionView[];
  historyPending: boolean;
  deleteCandidate: SavedConfigView | null;
  permanentDeleteCandidate: TrashedConfigView | null;
  savePending: boolean;
  restorePending: boolean;
  deletePending: boolean;
  permanentDeletePending: boolean;
  checkpointLabel: string;
  recoveryTime: string;
  onAuthOpenChange(open: boolean): void;
  onAccountOpenChange(open: boolean): void;
  onSaveOpenChange(open: boolean): void;
  onLibraryOpenChange(open: boolean): void;
  onNameChange(name: string): void;
  onCheckpointLabelChange(label: string): void;
  onRecoveryTimeChange(time: string): void;
  onSave(event: FormEvent): void;
  onLoad(config: SavedConfigView): void;
  onOpenHistory(config: SavedConfigView): void;
  onCloseHistory(): void;
  onRestoreRevision(revision: number): void;
  onRestoreAtTime(event: FormEvent): void;
  onSelectDelete(config: SavedConfigView | null): void;
  onDelete(config: SavedConfigView): void;
  onUndelete(config: TrashedConfigView): void;
  onSelectPermanentDelete(config: TrashedConfigView | null): void;
  onPermanentDelete(config: TrashedConfigView): void;
};

export function GeneratorDialogs(props: Props) {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage === "en" ? "en-US" : "de-DE";
  return (
    <>
      <AuthDialog open={props.authOpen} onClose={() => props.onAuthOpenChange(false)} providers={props.authProviders} />
      {props.user && <AccountDialog open={props.accountOpen} onClose={() => props.onAccountOpenChange(false)} user={props.user} authProviders={props.authProviders} />}

      <Dialog open={props.saveOpen} onOpenChange={props.onSaveOpenChange}>
        <DialogContent className="small-dialog">
          <form className="dialog-form" onSubmit={props.onSave}>
            <div className="dialog-icon"><Save size={19} /></div>
            <p className="eyebrow">{t("IN DEINEM ACCOUNT")}</p>
            <DialogHeader>
              <DialogTitle>{t("Config speichern")}</DialogTitle>
              <DialogDescription>{t("Speichere die aktuelle Config in deiner Cloud-Bibliothek.")}</DialogDescription>
            </DialogHeader>
            <Label className="dialog-label">{t("Name")}<Input value={props.configName} onChange={(event) => props.onNameChange(event.target.value)} minLength={1} maxLength={60} autoFocus required /></Label>
            {props.currentId && <Label className="dialog-label">{t("Name des Speicherpunkts (optional)")}<Input value={props.checkpointLabel} onChange={(event) => props.onCheckpointLabelChange(event.target.value)} maxLength={80} placeholder={t("z. B. Vor dem Sensitivity-Experiment")} /></Label>}
            <div className="dialog-summary"><Clipboard size={16} /><span>{t("entriesActive", { count: props.enabledCount })}</span><span>{props.lineCount} {t("Zeilen")}</span></div>
            <Button type="submit" className="primary-button dialog-submit" disabled={props.savePending || Boolean(props.currentId && props.syncStatus === "syncing")}>
              {(props.savePending || props.syncStatus === "syncing") && <LoaderCircle className="spin" size={16} />}
              {props.currentId ? t("Änderungen speichern") : t("Neue Config speichern")}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={props.libraryOpen} onOpenChange={props.onLibraryOpenChange}>
        <DialogContent className="library-dialog">
          <div className="library-head"><DialogHeader><p className="eyebrow">{t("DEINE CLOUD")}</p><DialogTitle>{t("Gespeicherte Configs")}</DialogTitle><DialogDescription className="muted">{t("Öffne oder verwalte deine gespeicherten Configs.")}</DialogDescription></DialogHeader></div>
          {props.configsFetching ? <div className="library-loading"><LoaderCircle className="spin" size={22} />{t("Configs werden geladen …")}</div> : props.configs.length ? (
            <div className="library-list">{props.configs.map((config) => (
              <div key={config.id} className={`library-row ${config.id === props.currentId ? "current" : ""}`}>
                <Button variant="ghost" className="library-load" onClick={() => props.onLoad(config)}>
                  <FileCode2 size={18} />
                  <span><strong>{config.name}</strong><small>{t("updatedAt", { date: new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(config.updatedAt)) })}</small></span>
                  <small className="library-type">{t("Revision")} {config.revision}</small>
                  {config.id === props.currentId && <Badge>{t("AKTIV")}</Badge>}
                </Button>
                <Button variant="ghost" className="library-delete" onClick={() => props.onOpenHistory(config)} aria-label={t("Versionsverlauf öffnen")}><History size={16} /></Button>
                <Button variant="ghost" className="library-delete" onClick={() => props.onSelectDelete(config)} aria-label={t("deleteConfigLabel", { name: config.name })}><Trash2 size={16} /></Button>
              </div>
            ))}</div>
          ) : (
            <div className="empty-state compact"><Cloud size={26} /><h2>{t("Noch keine Config gespeichert")}</h2><p>{t("Dein aktuelles Setup wartet schon.")}</p><Button className="primary-button" onClick={() => { props.onLibraryOpenChange(false); props.onSaveOpenChange(true); }}><Save size={16} />{t("Erste Config speichern")}</Button></div>
          )}
          {props.trash.length > 0 && <section className="trash-section">
            <p className="eyebrow">{t("PAPIERKORB")}</p>
            <div className="library-list">{props.trash.map((config) => (
              <div key={config.id} className="library-row is-trashed">
                <div className="library-load"><Trash2 size={18} /><span><strong>{config.name}</strong><small>{t("deletedAt", { date: new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(config.deletedAt!)) })}</small></span></div>
                <Button variant="ghost" className="library-delete" onClick={() => props.onUndelete(config)} aria-label={t("Wiederherstellen")}><Undo2 size={16} /></Button>
                <Button variant="ghost" className="library-delete" onClick={() => props.onSelectPermanentDelete(config)} aria-label={t("Endgültig löschen")}><Trash2 size={16} /></Button>
              </div>
            ))}</div>
          </section>}
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(props.historyConfig)} onOpenChange={(open) => !open && props.onCloseHistory()}>
        <DialogContent className="library-dialog history-dialog">
          <DialogHeader><p className="eyebrow">{t("VERSIONSVERLAUF")}</p><DialogTitle>{props.historyConfig?.name}</DialogTitle><DialogDescription className="muted">{t("Jeder bestätigte Stand kann als neue Revision wiederhergestellt werden.")}</DialogDescription></DialogHeader>
          <form className="point-in-time-form" onSubmit={props.onRestoreAtTime}>
            <Label>{t("Stand zu einem Zeitpunkt")}<Input type="datetime-local" step="1" value={props.recoveryTime} onChange={(event) => props.onRecoveryTimeChange(event.target.value)} required /></Label>
            <Button type="submit" variant="outline" disabled={!props.recoveryTime || props.restorePending}><Undo2 size={14} />{t("Zeitpunkt wiederherstellen")}</Button>
          </form>
          {props.historyPending ? <div className="library-loading"><LoaderCircle className="spin" size={22} />{t("Versionen werden geladen …")}</div> : props.historyItems.length ? (
            <div className="history-list">{props.historyItems.map((revision) => (
              <div className="history-row" key={revision.revision}>
                <div><strong>{t("Revision")} {revision.revision}</strong><small>{revision.label ? `${revision.label} · ` : ""}{t(`revisionKind.${revision.kind}`)} · {new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "medium" }).format(new Date(revision.createdAt))}</small></div>
                {revision.revision === props.historyConfig?.revision ? <Badge>{t("AKTUELL")}</Badge> : <Button variant="outline" size="sm" disabled={props.restorePending} onClick={() => props.onRestoreRevision(revision.revision)}><Undo2 size={14} />{t("Wiederherstellen")}</Button>}
              </div>
            ))}</div>
          ) : <div className="empty-state compact"><History size={26} /><p>{t("Keine Versionen gefunden.")}</p></div>}
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(props.deleteCandidate)} onOpenChange={(open) => !open && props.onSelectDelete(null)}>
        <AlertDialogContent className="delete-dialog"><AlertDialogHeader><AlertDialogTitle>{t("Config löschen?")}</AlertDialogTitle><AlertDialogDescription>{t("deleteConfigDescription", { name: props.deleteCandidate?.name })}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>{t("Abbrechen")}</AlertDialogCancel><AlertDialogAction variant="destructive" disabled={props.deletePending} onClick={() => props.deleteCandidate && props.onDelete(props.deleteCandidate)}>{t("In Papierkorb")}</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={Boolean(props.permanentDeleteCandidate)} onOpenChange={(open) => !open && props.onSelectPermanentDelete(null)}>
        <AlertDialogContent className="delete-dialog"><AlertDialogHeader><AlertDialogTitle>{t("Config endgültig löschen?")}</AlertDialogTitle><AlertDialogDescription>{t("Die Config und ihr vollständiger Versionsverlauf werden unwiderruflich entfernt.")}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>{t("Abbrechen")}</AlertDialogCancel><AlertDialogAction variant="destructive" disabled={props.permanentDeletePending} onClick={() => props.permanentDeleteCandidate && props.onPermanentDelete(props.permanentDeleteCandidate)}>{t("Endgültig löschen")}</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
    </>
  );
}
