"use client";

import { Check, Copy, Download, FileCode2, Keyboard } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { ConfigTypeDefinition } from "../domain/config-types";
import { ConfigCode } from "./config-code";

type Props = {
  open: boolean;
  source: string;
  definition: ConfigTypeDefinition;
  configName: string;
  lineCount: number;
  conflictCount: number;
  copied: boolean;
  onOpenChange(open: boolean): void;
  onCopy(): void;
  onDownload(): void;
};

export function ConfigOutputDialog({
  open,
  source,
  definition,
  configName,
  lineCount,
  conflictCount,
  copied,
  onOpenChange,
  onCopy,
  onDownload,
}: Props) {
  const { t } = useTranslation();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="output-dialog">
        <DialogHeader className="output-dialog-head">
          <span className="output-dialog-icon"><FileCode2 /></span>
          <div>
            <DialogTitle>{definition.fileName}</DialogTitle>
            <DialogDescription>
              {configName} · {t("lineCount", { count: lineCount })}
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="output-dialog-code"><ConfigCode source={source} /></div>

        {conflictCount > 0 && (
          <div className="config-warning"><Keyboard size={15} /><span>{t("conflictCount", { count: conflictCount })}</span></div>
        )}

        <p className="config-path">{definition.outputKind === "launch-options"
          ? <>{t("In Steam einfügen unter")}<br /><code>{t("Eigenschaften → Allgemein → Startoptionen")}</code></>
          : <>{t("Installiere unter")}<br /><code>…/game/csgo/cfg/{definition.fileName}</code></>}</p>

        <div className="output-dialog-actions">
          <Button variant="outline" className="ghost-button" onClick={onCopy}>
            {copied ? <Check size={16} /> : <Copy size={16} />}{copied ? t("Kopiert") : t("Kopieren")}
          </Button>
          <Button className="download-button" onClick={onDownload}><Download size={16} />{t("Download")}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
