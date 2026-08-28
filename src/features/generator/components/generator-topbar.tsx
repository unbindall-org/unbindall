"use client";

import Link from "next/link";
import { Cloud, LoaderCircle, PanelRightOpen, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export type ConfigPickerItem = { id: string; name: string };

type Props = {
  signedIn: boolean;
  currentId: string | null;
  currentName: string;
  configs: ConfigPickerItem[];
  loading: boolean;
  outputPanelOpen: boolean;
  onSelectConfig(id: string): void;
  onOpenOutputPanel(): void;
};

export function GeneratorTopbar({ signedIn, currentId, currentName, configs, loading, outputPanelOpen, onSelectConfig, onOpenOutputPanel }: Props) {
  const { t } = useTranslation();
  return (
    <header className="topbar">
      <SidebarTrigger aria-label={t("Navigation öffnen")} />
      <div className="topbar-actions">
        {signedIn && <div className="config-picker">
          <Cloud size={15} />
          <Select value={currentId ?? ""} disabled={loading} onValueChange={onSelectConfig}>
            <SelectTrigger aria-label={t("Aktive Config auswählen")}>
              <SelectValue>{currentId ? currentName : configs.length ? t("Cloud-Config auswählen") : t("Noch keine Cloud-Config")}</SelectValue>
            </SelectTrigger>
            <SelectContent align="end" position="popper">
              {configs.map((config) => <SelectItem key={config.id} value={config.id}>{config.name}</SelectItem>)}
            </SelectContent>
          </Select>
          {loading && <LoaderCircle className="spin" size={14} />}
        </div>}
        <Button className="primary-button" asChild><Link href="/new"><Plus />{t("Neue Config")}</Link></Button>
        {!outputPanelOpen && <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" size="icon" className="icon-button config-panel-toggle" onClick={onOpenOutputPanel} aria-controls="config-panel" aria-expanded={false} aria-label={t("Config-Ausgabe einblenden")}>
              <PanelRightOpen size={16} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t("Config-Ausgabe einblenden")}</TooltipContent>
        </Tooltip>}
      </div>
    </header>
  );
}
