"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Rocket } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";
import { commands, isCommandEditable, presets } from "@/features/generator/catalog/commands";
import { createDefaultDocument } from "@/features/generator/domain/document";
import { defaultConfigName, getConfigTypeDefinition, isCommandAvailable } from "@/features/generator/domain/config-types";
import type { ConfigType } from "@/features/generator/domain/types";

function configTypeForPreset(name: string): ConfigType {
  if (name === "server-competitive") return "server";
  if (name === "practice") return "practice";
  return "matchmaking";
}

export function NewConfigPage() {
  const { t } = useTranslation();
  const router = useRouter();

  function applyPreset(preset: (typeof presets)[number]) {
    const configType = configTypeForPreset(preset.name);
    const document = createDefaultDocument(configType);

    for (const [name, value] of Object.entries(preset.values)) {
      const command = commands.find((item) => item.name === name);
      if (!command || !isCommandEditable(command) || !isCommandAvailable(configType, command)) continue;
      document.commandValues[name] = value;
      document.commandValues[`enabled:${name}`] = true;
    }

    window.localStorage.setItem("unbindall:draft", JSON.stringify(document));
    window.localStorage.setItem("unbindall:draft-meta", JSON.stringify({
      name: t(defaultConfigName(configType)),
      currentId: null,
      revision: 0,
      syncedFingerprint: "",
    }));
    router.push("/");
  }

  return (
    <main className="new-config-page">
      <header className="new-config-nav">
        <Link className="new-config-brand" href="/">
          <span className="brand-symbol"><Logo size={30} /></span>
          <span className="brand-text"><strong>UNBINDALL</strong><span>CS2 CONFIG</span></span>
        </Link>
        <Button variant="outline" asChild><Link href="/"><ArrowLeft />{t("Zurück zum Generator")}</Link></Button>
      </header>

      <section className="new-config-content">
        <div className="new-config-heading">
          <span className="new-config-icon"><Rocket /></span>
          <p className="eyebrow">{t("SCHNELLSTART")}</p>
          <h1>{t("Neue Config erstellen")}</h1>
          <p>{t("Wähle eine Vorlage als Ausgangspunkt. Du kannst danach jede Einstellung frei anpassen.")}</p>
        </div>

        <div className="quickstart-grid">
          {presets.map((preset) => {
            const configType = configTypeForPreset(preset.name);
            return (
              <button className="quickstart-card" key={preset.name} type="button" onClick={() => applyPreset(preset)}>
                <span className="quickstart-type">{t(getConfigTypeDefinition(configType).label)}</span>
                <strong>{t(preset.label)}</strong>
                <p>{t(preset.description)}</p>
                <span className="quickstart-action">{t("Schnellstart verwenden")}<ArrowRight /></span>
              </button>
            );
          })}
        </div>
      </section>
    </main>
  );
}
