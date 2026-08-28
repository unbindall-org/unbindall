"use client";

import { useTranslation } from "react-i18next";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import type { CommandDefinition, ConfigState } from "../catalog/commands";

export function CommandControl({
  command,
  state,
  onChange,
}: {
  command: CommandDefinition;
  state: ConfigState;
  onChange: (name: string, value: string | number | boolean) => void;
}) {
  const { t } = useTranslation();
  const enabled = Boolean(state[`enabled:${command.name}`]);
  const value = state[command.name];
  const deprecated = command.status.verification === "deprecated";

  function setValue(next: string | number | boolean) {
    onChange(command.name, next);
    if (!enabled) onChange(`enabled:${command.name}`, true);
  }

  return (
    <div className={`command-card ${enabled ? "is-enabled" : ""}`} data-command={command.name}>
      <Checkbox
        className="enable-check"
        checked={enabled}
        disabled={deprecated}
        onCheckedChange={(checked) => onChange(`enabled:${command.name}`, checked === true)}
        aria-label={`${command.label} ${enabled ? t("Deaktivieren") : t("Aktivieren")}`}
      />
      <div className="command-copy">
        <div className="command-heading">
          <h3>{command.label}</h3>
          <span className="command-name">{command.name}</span>
        </div>
        <p className="command-desc">{command.description}</p>
        <div className="command-statuses">
          <span className={`command-status ${deprecated ? "is-deprecated" : "is-verified"}`}>
            {t(deprecated ? "Veraltet" : "Verifiziert")}
          </span>
          {command.status.restrictions.includes("offline-only") && <span className="command-status is-restricted">{t("Nur offline")}</span>}
          {command.status.restrictions.includes("requires-cheats") && <span className="command-status is-cheat">{t("Erfordert Cheats")}</span>}
          <span className="command-status is-version">{t("Zuletzt mit CS2-Version {{version}} geprüft", { version: command.status.checkedVersion })}</span>
        </div>
      </div>
      <div className="command-input">
        {command.type === "range" && (
          <div className="range-control">
            <Slider
              min={command.min}
              max={command.max}
              step={command.step}
              value={[Number(value)]}
              disabled={deprecated}
              onValueChange={(next) => setValue(next[0])}
              aria-label={command.label}
            />
            <label className="number-field">
              <Input
                type="number"
                min={command.min}
                max={command.max}
                step={command.step}
                value={Number(value)}
                disabled={deprecated}
                onChange={(event) => setValue(Number(event.target.value))}
              />
              {command.unit && <span>{command.unit}</span>}
            </label>
          </div>
        )}
        {command.type === "toggle" && (
          <div className="switch-control">
            <span className={Boolean(value) ? "" : "active"}>{t("Aus")}</span>
            <Switch checked={Boolean(value)} disabled={deprecated} onCheckedChange={setValue} aria-label={command.label} />
            <span className={Boolean(value) ? "active" : ""}>{t("An")}</span>
          </div>
        )}
        {command.type === "select" && (
          <Select value={String(value)} disabled={deprecated} onValueChange={(next) => {
            const option = command.options?.find((item) => String(item.value) === next);
            if (option) setValue(option.value);
          }}>
            <SelectTrigger className="command-select" aria-label={command.label}><SelectValue /></SelectTrigger>
            <SelectContent position="popper">
              {command.options?.map((option) => <SelectItem key={option.value} value={String(option.value)}>{option.label}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        {command.type === "text" && (
          <Input
            className="command-text-input"
            value={String(value)}
            disabled={deprecated}
            maxLength={120}
            onChange={(event) => setValue(event.target.value)}
            aria-label={command.label}
          />
        )}
        {command.type === "action" && <span className="command-action-note">{t("Beim Laden einmal ausführen")}</span>}
      </div>
    </div>
  );
}
