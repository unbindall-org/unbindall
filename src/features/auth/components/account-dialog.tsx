"use client";

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { DiscordLogoIcon } from "@phosphor-icons/react";
import { signIn, signOut } from "next-auth/react";
import { useTranslation } from "react-i18next";
import { Download, LoaderCircle, ShieldCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { Session } from "next-auth";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { accountExportFilename } from "@/features/account/export-file";
import { useTRPC } from "@/trpc/client";

type Props = {
  open: boolean;
  onClose: () => void;
  user: NonNullable<Session["user"]>;
  authProviders: { discord: boolean; steam: boolean };
};

export function AccountDialog({ open, onClose, user, authProviders }: Props) {
  const { t } = useTranslation();
  const trpc = useTRPC();
  const detailsQuery = useQuery(trpc.account.details.queryOptions(undefined, {
    enabled: open,
    retry: false,
  }));
  const exportQuery = useQuery(trpc.account.export.queryOptions(undefined, {
    enabled: false,
    retry: false,
    staleTime: 0,
  }));
  const deleteAccountMutation = useMutation(trpc.account.delete.mutationOptions());
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [linkingDiscord, setLinkingDiscord] = useState(false);
  const exporting = exportQuery.isFetching;
  const deleting = deleteAccountMutation.isPending;
  const hasPassword = detailsQuery.data?.hasPassword ?? true;

  // Das Passwort darf nicht über ein geschlossenes Dialogfenster hinaus im
  // State stehen bleiben.
  function close() {
    setPassword("");
    setConfirmOpen(false);
    onClose();
  }

  async function exportData() {
    try {
      const result = await exportQuery.refetch();
      if (result.error) throw result.error;
      if (!result.data) throw new Error("Export fehlgeschlagen.");
      const blob = new Blob([JSON.stringify(result.data, null, 2)], {
        type: "application/json;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = accountExportFilename();
      anchor.click();
      URL.revokeObjectURL(url);
      toast.success(t("Datenexport heruntergeladen."));
    } catch (error) {
      toast.error(t(error instanceof Error ? error.message : "Export fehlgeschlagen."));
    }
  }

  async function deleteAccount() {
    try {
      await deleteAccountMutation.mutateAsync({ password });

      setPassword("");
      toast.success(t("Account gelöscht."));
      // Die JWT-Session bleibt sonst bis zum Ablauf gültig, obwohl der Nutzer
      // in der Datenbank nicht mehr existiert.
      await signOut({ callbackUrl: "/" });
    } catch (error) {
      toast.error(t(error instanceof Error ? error.message : "Account konnte nicht gelöscht werden."));
    } finally {
      setConfirmOpen(false);
    }
  }

  async function linkDiscord() {
    setLinkingDiscord(true);
    try {
      // Auth.js only links an unknown OAuth identity when this authenticated
      // session cookie survives the round trip through Discord.
      await signIn("discord", { callbackUrl: "/" });
    } catch {
      setLinkingDiscord(false);
      toast.error(t("Discord konnte nicht verknüpft werden."));
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && close()}>
        <DialogContent className="account-dialog" aria-label={t("Account & Daten")}>
          <div className="dialog-icon"><ShieldCheck size={19} /></div>
          <p className="eyebrow">{t("ACCOUNT & DATEN")}</p>
          <DialogHeader>
            <DialogTitle>{t("Deine Daten")}</DialogTitle>
            <DialogDescription className="muted">
              {t("Lade alles herunter, was zu deinem Account gespeichert ist, oder lösche ihn vollständig.")}
            </DialogDescription>
          </DialogHeader>

          <div className="account-identity">
            <strong>{user.name}</strong>
            <small>{user.email ?? t("Verknüpfter OAuth-Account")}</small>
          </div>

          {authProviders.discord && !detailsQuery.data?.providers.includes("discord") && (
            <section className="account-section">
              <h3>{t("Anmeldeanbieter verknüpfen")}</h3>
              <p>{t("Verknüpfe Discord nur hier aus deiner bereits bestätigten Sitzung heraus.")}</p>
              <Button
                variant="outline"
                className="oauth-button discord account-action"
                disabled={linkingDiscord || detailsQuery.isPending}
                onClick={linkDiscord}
              >
                {linkingDiscord ? <LoaderCircle className="spin" size={18} /> : <DiscordLogoIcon size={19} weight="fill" />}
                {t("Discord verknüpfen")}
              </Button>
            </section>
          )}

          <section className="account-section">
            <h3>{t("Daten exportieren")}</h3>
            <p>{t("Eine JSON-Datei mit deinem Account und allen Cloud-Configs. Dein Passwort ist nicht enthalten.")}</p>
            <Button variant="outline" className="ghost-button account-action" onClick={exportData} disabled={exporting}>
              {exporting ? <LoaderCircle className="spin" size={16} /> : <Download size={16} />}
              {t("Export herunterladen")}
            </Button>
          </section>

          <section className="account-section is-danger">
            <h3>{t("Account löschen")}</h3>
            <p>{t("Entfernt deinen Account, alle Cloud-Configs und alle Sitzungen unwiderruflich.")}</p>
            {hasPassword && (
              <Label className="dialog-label">
                {t("Passwort bestätigen")}
                <Input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="current-password"
                  maxLength={128}
                  placeholder={t("Dein aktuelles Passwort")}
                />
              </Label>
            )}
            <Button
              variant="outline"
              className="account-action account-delete"
              disabled={detailsQuery.isPending || (hasPassword && password.length < 8) || deleting}
              onClick={() => setConfirmOpen(true)}
            >
              {deleting ? <LoaderCircle className="spin" size={16} /> : <Trash2 size={16} />}
              {t("Account endgültig löschen")}
            </Button>
          </section>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmOpen} onOpenChange={(nextOpen) => !nextOpen && setConfirmOpen(false)}>
        <AlertDialogContent className="delete-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("Account wirklich löschen?")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("Alle Cloud-Configs werden mitgelöscht. Das lässt sich nicht rückgängig machen.")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("Abbrechen")}</AlertDialogCancel>
            <AlertDialogAction variant="destructive" disabled={deleting} onClick={deleteAccount}>
              {t("Endgültig löschen")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
