"use client";

import { useMemo, useState } from "react";
import { BookOpenCheck, Search, ShieldCheck, TriangleAlert } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { categories, commandRegistry, CS2_CATALOG_VERSION, type CommandStatus } from "../catalog/commands";

type StatusFilter = "all" | CommandStatus["verification"];

export function CommandRegister({ open, onOpenChange }: { open: boolean; onOpenChange(open: boolean): void }) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const verifiedCount = commandRegistry.filter((entry) => entry.status.verification === "verified").length;
  const deprecatedCount = commandRegistry.length - verifiedCount;

  const entries = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return commandRegistry.filter((entry) => {
      if (statusFilter !== "all" && entry.status.verification !== statusFilter) return false;
      const category = categories.find((item) => item.id === entry.area);
      return !normalizedQuery || [
        entry.name,
        t(entry.label),
        t(entry.description),
        t(category?.label ?? entry.area),
        t(entry.source === "setting" ? "Config-Einstellung" : "Keybind-Aktion"),
        t(entry.status.verification === "verified" ? "Verifiziert" : "Veraltet"),
        ...entry.status.restrictions.map((restriction) => t(restriction === "offline-only" ? "Nur offline" : "Erfordert Cheats")),
      ].join(" ").toLowerCase().includes(normalizedQuery);
    });
  }, [query, statusFilter, t]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="command-register-dialog">
        <DialogHeader className="command-register-head">
          <span className="command-register-icon"><BookOpenCheck /></span>
          <div>
            <DialogTitle>{t("Command-Register")}</DialogTitle>
            <DialogDescription>{t("Alle Commands, die UNBINDALL kennt, mit ihrem aktuellen Prüfstatus an einem Ort.")}</DialogDescription>
          </div>
        </DialogHeader>

        <div className="command-register-summary">
          <span><strong>{commandRegistry.length}</strong>{t("Commands gesamt")}</span>
          <span className="is-verified"><ShieldCheck /><strong>{verifiedCount}</strong>{t("Verifiziert")}</span>
          <span className="is-deprecated"><TriangleAlert /><strong>{deprecatedCount}</strong>{t("Veraltet")}</span>
          <small>{t("Geprüft mit CS2 {{version}}", { version: CS2_CATALOG_VERSION })}</small>
        </div>

        <div className="command-register-toolbar">
          <label className="command-register-search">
            <Search size={16} />
            <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("Register durchsuchen …")} />
          </label>
          <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as StatusFilter)}>
            <SelectTrigger aria-label={t("Nach Status filtern")}><SelectValue /></SelectTrigger>
            <SelectContent align="end" position="popper">
              <SelectItem value="all">{t("Alle Status")}</SelectItem>
              <SelectItem value="verified">{t("Verifiziert")}</SelectItem>
              <SelectItem value="deprecated">{t("Veraltet")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="command-register-table" role="table" aria-label={t("Command-Register")}>
          <div className="command-register-row command-register-columns" role="row">
            <span role="columnheader">{t("Command")}</span>
            <span role="columnheader">{t("Bereich")}</span>
            <span role="columnheader">{t("Status")}</span>
          </div>
          <div className="command-register-body">
            {entries.map((entry) => {
              const category = categories.find((item) => item.id === entry.area);
              const deprecated = entry.status.verification === "deprecated";
              return (
                <div className="command-register-row" role="row" key={entry.id}>
                  <div className="command-register-command" role="cell">
                    <code>{entry.name}</code>
                    <strong>{t(entry.label)}</strong>
                    <span>{t(entry.description)}</span>
                  </div>
                  <div className="command-register-area" role="cell">
                    <strong>{t(category?.label ?? entry.area)}</strong>
                    <span>{t(entry.source === "setting" ? "Config-Einstellung" : "Keybind-Aktion")}</span>
                  </div>
                  <div className="command-register-status" role="cell">
                    <span className={`command-status ${deprecated ? "is-deprecated" : "is-verified"}`}>
                      {t(deprecated ? "Veraltet" : "Verifiziert")}
                    </span>
                    {entry.status.restrictions.includes("offline-only") && <span className="command-status is-restricted">{t("Nur offline")}</span>}
                    {entry.status.restrictions.includes("requires-cheats") && <span className="command-status is-cheat">{t("Erfordert Cheats")}</span>}
                    {deprecated && <small>{t("Nicht im Editor verfügbar")}</small>}
                  </div>
                </div>
              );
            })}
            {!entries.length && <div className="command-register-empty">{t("Keine Commands für diesen Filter gefunden.")}</div>}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
