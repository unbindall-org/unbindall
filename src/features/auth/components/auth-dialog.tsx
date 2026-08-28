"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { DiscordLogoIcon, SteamLogoIcon } from "@phosphor-icons/react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { LoaderCircle, LockKeyhole } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTRPC } from "@/trpc/client";

export function AuthDialog({ open, onClose, providers }: {
  open: boolean;
  onClose: () => void;
  providers: { discord: boolean; steam: boolean };
}) {
  const { t } = useTranslation();
  const trpc = useTRPC();
  const router = useRouter();
  const register = useMutation(trpc.auth.register.mutationOptions());
  const [mode, setMode] = useState<"login" | "register">("login");
  const [loading, setLoading] = useState<"credentials" | "discord" | "steam" | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading("credentials");
    const data = new FormData(event.currentTarget);
    const email = String(data.get("email"));
    const password = String(data.get("password"));

    try {
      if (mode === "register") {
        await register.mutateAsync({ name: String(data.get("name")), email, password });
      }

      const result = await signIn("credentials", { email, password, redirect: false });
      if (result?.error) throw new Error(t("E-Mail oder Passwort ist nicht korrekt."));
      toast.success(mode === "register" ? t("Account erstellt.") : t("Willkommen zurück."));
      window.location.reload();
    } catch (error) {
      toast.error(error instanceof Error ? t(error.message) : t("Anmeldung fehlgeschlagen."));
    } finally {
      setLoading(null);
    }
  }

  async function socialSignIn(provider: "discord" | "steam") {
    setLoading(provider);
    try {
      if (provider === "discord") {
        await signIn("discord", { callbackUrl: "/" });
      } else {
        router.push("/api/auth/steam");
      }
    } catch {
      toast.error(t("Anmeldung fehlgeschlagen."));
      setLoading(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className="auth-dialog" aria-label="Account">
        <div className="auth-mark"><LockKeyhole size={22} /></div>
        <p className="eyebrow">{t("UNBINDALL ACCOUNT")}</p>
        <DialogHeader>
          <DialogTitle>{mode === "login" ? t("Cloud-Configs öffnen") : t("Dein Loadout, überall")}</DialogTitle>
          <DialogDescription className="muted">{t("Speichere mehrere Autoexecs sicher in deinem Account.")}</DialogDescription>
        </DialogHeader>

        <Tabs className="auth-tabs" value={mode} onValueChange={(value) => setMode(value as "login" | "register")}>
          <TabsList>
            <TabsTrigger value="login">{t("Anmelden")}</TabsTrigger>
            <TabsTrigger value="register">{t("Registrieren")}</TabsTrigger>
          </TabsList>
        </Tabs>

        {(providers.discord || providers.steam) && (
          <>
            <div className="oauth-buttons">
              {providers.steam && (
                <Button type="button" variant="outline" className="oauth-button steam" disabled={Boolean(loading)} onClick={() => socialSignIn("steam")}>
                  {loading === "steam" ? <LoaderCircle className="spin" size={18} /> : <SteamLogoIcon size={19} weight="fill" />}
                  {t("Mit Steam anmelden")}
                </Button>
              )}
              {providers.discord && (
                <Button type="button" variant="outline" className="oauth-button discord" disabled={Boolean(loading)} onClick={() => socialSignIn("discord")}>
                  {loading === "discord" ? <LoaderCircle className="spin" size={18} /> : <DiscordLogoIcon size={19} weight="fill" />}
                  {t("Mit Discord anmelden")}
                </Button>
              )}
            </div>
            <div className="auth-divider"><span>{t("oder mit E-Mail")}</span></div>
          </>
        )}

        <form onSubmit={submit} className="auth-form">
          {mode === "register" && <Label>{t("Name")}<Input name="name" autoComplete="name" minLength={2} required placeholder={t("Dein Name")} /></Label>}
          <Label>{t("E-Mail")}<Input name="email" type="email" autoComplete="email" required placeholder="you@example.com" /></Label>
          <Label>{t("Passwort")}<Input name="password" type="password" minLength={8} maxLength={128} autoComplete={mode === "login" ? "current-password" : "new-password"} required placeholder={t("Mindestens 8 Zeichen")} /></Label>
          <Button type="submit" className="primary-button auth-submit" disabled={Boolean(loading)}>
            {loading === "credentials" && <LoaderCircle className="spin" size={17} />}
            {mode === "login" ? t("Anmelden") : t("Account erstellen")}
          </Button>
        </form>
        <p className="auth-note">{t("Deine Config bleibt auch ohne Account dauerhaft in diesem Browser gespeichert. Ein Account ergänzt nur die Cloud-Speicherung.")}</p>
      </DialogContent>
    </Dialog>
  );
}
