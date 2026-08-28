"use client";

import { Check, Copy, Download, Keyboard, PanelRightClose } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { ConfigTypeDefinition } from "../domain/config-types";
import { ConfigCode } from "./config-code";

type Props = {
  open: boolean;
  source: string;
  definition: ConfigTypeDefinition;
  lineCount: number;
  conflictCount: number;
  copied: boolean;
  onClose(): void;
  onCopy(): void;
  onDownload(): void;
};

export function ConfigOutputPanel({ open, source, definition, lineCount, conflictCount, copied, onClose, onCopy, onDownload }: Props) {
  const { t } = useTranslation();
  return (
    <aside id="config-panel" className="config-panel" aria-hidden={!open} inert={!open}>
      <div className="config-panel-head">
        <div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="icon-button config-panel-head-toggle" onClick={onClose} aria-controls="config-panel" aria-expanded={true} aria-label={t("Config-Ausgabe ausblenden")}>
                <PanelRightClose size={16} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t("Config-Ausgabe ausblenden")}</TooltipContent>
          </Tooltip>
          <span className="status-dot" /><strong>{definition.fileName}</strong>
        </div>
        <span>{lineCount} {t("Zeilen")}</span>
      </div>
      <ConfigCode source={source} />
      {conflictCount > 0 && <div className="config-warning"><Keyboard size={15} /><span>{t("conflictCount", { count: conflictCount })}</span></div>}
      <div className="config-panel-actions">
        <Button variant="outline" className="ghost-button" onClick={onCopy}>{copied ? <Check size={16} /> : <Copy size={16} />}{copied ? t("Kopiert") : t("Kopieren")}</Button>
        <Button className="download-button" onClick={onDownload}><Download size={16} />{t("Download")}</Button>
      </div>
      <p className="config-path">{definition.outputKind === "launch-options"
        ? <>{t("In Steam einfügen unter")}<br /><code>{t("Eigenschaften → Allgemein → Startoptionen")}</code></>
        : <>{t("Installiere unter")}<br /><code>…/game/csgo/cfg/{definition.fileName}</code></>}</p>
    </aside>
  );
}
