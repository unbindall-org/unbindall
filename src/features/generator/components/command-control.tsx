"use client";

import { memo } from "react";
import { useTranslation } from "react-i18next";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { isCommandEditable, type CommandDefinition, type ConfigState } from "../catalog/commands";

function CommandControlComponent({
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

  if (!isCommandEditable(command)) return null;

  function setValue(next: string | number | boolean) {
    onChange(command.name, next);
  }

  return (
    <div className={`command-card ${enabled ? "is-enabled" : ""}`} data-command={command.name}>
      <Checkbox
        className="enable-check"
        checked={enabled}
        onCheckedChange={(checked) => onChange(`enabled:${command.name}`, checked === true)}
        aria-label={`${command.label} ${enabled ? t("Deaktivieren") : t("Aktivieren")}`}
      />
      <div className="command-copy">
        <div className="command-heading">
          <h3>{command.label}</h3>
          <span className="command-name">{command.name}</span>
        </div>
        <p className="command-desc">{command.description}</p>
      </div>
      <div className="command-input">
        {command.type === "range" && (
          <div className="range-control">
            <Slider
              min={command.min}
              max={command.max}
              step={command.step}
              value={[Number(value)]}
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
                onChange={(event) => setValue(Number(event.target.value))}
              />
              {command.unit && <span>{command.unit}</span>}
            </label>
          </div>
        )}
        {command.type === "toggle" && (
          <div className="switch-control">
            <span className={Boolean(value) ? "" : "active"}>{t("Aus")}</span>
            <Switch checked={Boolean(value)} onCheckedChange={setValue} aria-label={command.label} />
            <span className={Boolean(value) ? "active" : ""}>{t("An")}</span>
          </div>
        )}
        {command.type === "select" && (
          <Select value={String(value)} onValueChange={(next) => {
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

/**
 * A document update creates a new commandValues object. Most cards do not use
 * the changed entry, so compare the two values this card actually renders.
 */
export const CommandControl = memo(CommandControlComponent, (previous, next) =>
  previous.command === next.command &&
  previous.onChange === next.onChange &&
  previous.state[previous.command.name] === next.state[next.command.name] &&
  previous.state[`enabled:${previous.command.name}`] === next.state[`enabled:${next.command.name}`]);
