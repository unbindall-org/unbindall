"use client";

import { memo } from "react";
import { AlertTriangle, KeyRound, Plus, ShieldCheck, Trash2, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { bindActions } from "../catalog/commands";
import { createCustomBind, createMultiBind } from "../domain/document";
import { findBindingConflicts, keySuggestions, sanitizeKey, validateCustomCommand } from "../domain/bindings";
import type { CustomBind, GeneratorDocument, MultiBind, StandardBind } from "../domain/types";

type ModuleProps = {
  document: GeneratorDocument;
  query: string;
  onChange: (document: GeneratorDocument) => void;
  enabledOnly?: boolean;
};

const actionMap = new Map(bindActions.map((action) => [action.id, action]));

function StandardBindsModuleComponent({ document, query, onChange, enabledOnly = false }: ModuleProps) {
  const { t } = useTranslation();
  const conflicts = findBindingConflicts(document);
  const normalizedQuery = query.trim().toLowerCase();
  const groups = [...new Set(bindActions.map((action) => action.group))];

  function update(actionId: string, patch: Partial<StandardBind>) {
    onChange({
      ...document,
      standardBinds: document.standardBinds.map((binding) => binding.actionId === actionId ? { ...binding, ...patch } : binding),
    });
  }

  return (
    <div className="bind-groups">
      {groups.map((group) => {
        const actions = bindActions.filter((action) => action.group === group &&
          (!enabledOnly || document.standardBinds.some((binding) => binding.actionId === action.id && binding.enabled)) &&
          (!normalizedQuery || `${action.label} ${t(action.label)} ${action.command} ${action.group} ${t(action.group)}`.toLowerCase().includes(normalizedQuery)));
        if (!actions.length) return null;
        return (
          <div className="bind-group" key={group}>
            <div className="bind-group-heading"><strong>{t(group)}</strong><span>{actions.length}</span></div>
            <div className="command-list">
              {actions.map((action) => {
                const binding = document.standardBinds.find((item) => item.actionId === action.id) ?? {
                  actionId: action.id, key: action.defaultKey, enabled: false,
                };
                const conflict = binding.enabled && conflicts.has(sanitizeKey(binding.key));
                return (
                  <div className={`command-card bind-card ${binding.enabled ? "is-enabled" : ""} ${conflict ? "has-conflict" : ""}`} key={action.id}>
                    <EnableButton enabled={binding.enabled} onClick={() => update(action.id, { enabled: !binding.enabled })} />
                    <div className="command-copy">
                      <div className="command-heading"><h3>{t(action.label)}</h3><span className="command-name">{action.command}</span></div>
                      {conflict && <p className="conflict-note"><AlertTriangle size={13} />{t("Wird von einem anderen Bind überschrieben")}</p>}
                    </div>
                    <div className="command-input"><KeyInput value={binding.key} conflict={conflict} onChange={(key) => update(action.id, { key, enabled: true })} /></div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MultiBindsModuleComponent({ document, query, onChange, enabledOnly = false }: ModuleProps) {
  const { t } = useTranslation();
  const normalizedQuery = query.trim().toLowerCase();
  const conflicts = findBindingConflicts(document);
  const visible = document.multiBinds.filter((binding) => {
    const action = actionMap.get(binding.actionId as (typeof bindActions)[number]["id"]);
    return (!enabledOnly || binding.enabled) &&
      (!normalizedQuery || `${binding.label} ${t(binding.label)} ${action?.label ?? ""} ${action ? t(action.label) : ""} ${action?.command ?? ""} ${binding.keys.join(" ")}`.toLowerCase().includes(normalizedQuery));
  });

  function update(id: string, patch: Partial<MultiBind>) {
    onChange({ ...document, multiBinds: document.multiBinds.map((binding) => binding.id === id ? { ...binding, ...patch } : binding) });
  }

  function remove(id: string) {
    onChange({ ...document, multiBinds: document.multiBinds.filter((binding) => binding.id !== id) });
  }

  return (
    <div className="bind-module-stack">
      <div className="module-notice safe"><ShieldCheck size={18} /><div><strong>{t("Eine Aktion, mehrere Tasten")}</strong><p>{t("Das erzeugt pro Taste eine normale Bind-Zeile. Es automatisiert keine Bewegungs- oder Angriffsfolge.")}</p></div></div>
      {visible.map((binding) => {
        const action = actionMap.get(binding.actionId as (typeof bindActions)[number]["id"]);
        return (
          <div className={`builder-card ${binding.enabled ? "is-enabled" : ""}`} key={binding.id}>
            <div className="builder-card-head">
              <EnableButton enabled={binding.enabled} onClick={() => update(binding.id, { enabled: !binding.enabled })} />
              <Input className="builder-title-input" value={t(binding.label)} maxLength={50} aria-label={t("Name des Double-Binds")} onChange={(event) => update(binding.id, { label: event.target.value })} />
              <Button variant="outline" size="icon" className="icon-button danger-button" onClick={() => remove(binding.id)} aria-label={t("Double-Bind löschen")}><Trash2 size={15} /></Button>
            </div>
            <div className="builder-grid">
              <label>{t("Aktion")}
                <Select value={binding.actionId} onValueChange={(actionId) => update(binding.id, { actionId })}>
                  <SelectTrigger className="builder-select"><SelectValue /></SelectTrigger>
                  <SelectContent position="popper">
                  {[...new Set(bindActions.map((item) => item.group))].map((group) => (
                    <SelectGroup key={group}><SelectLabel>{t(group)}</SelectLabel>{bindActions.filter((item) => item.group === group).map((item) => <SelectItem key={item.id} value={item.id}>{t(item.label)} · {item.command}</SelectItem>)}</SelectGroup>
                  ))}
                  </SelectContent>
                </Select>
              </label>
              <div className="multi-key-field">
                <span>{t("Tasten")}</span>
                <div className="multi-key-list">
                  {binding.keys.map((key, index) => {
                    const conflict = binding.enabled && conflicts.has(sanitizeKey(key));
                    return (
                      <div className="multi-key-item" key={`${binding.id}-${index}`}>
                        <KeyInput value={key} conflict={conflict} onChange={(value) => update(binding.id, { keys: binding.keys.map((item, itemIndex) => itemIndex === index ? value : item) })} />
                        {binding.keys.length > 2 && <Button variant="ghost" size="icon-xs" onClick={() => update(binding.id, { keys: binding.keys.filter((_, itemIndex) => itemIndex !== index) })} aria-label={t("Taste entfernen")}><X size={13} /></Button>}
                      </div>
                    );
                  })}
                  {binding.keys.length < 4 && <Button variant="outline" size="sm" className="add-key-button" onClick={() => update(binding.id, { keys: [...binding.keys, ""] })}><Plus size={13} />{t("Taste")}</Button>}
                </div>
              </div>
            </div>
            <div className="bind-output-preview">
              {binding.keys.filter(Boolean).map((key) => <code key={key}>bind &quot;{sanitizeKey(key)}&quot; &quot;{action?.command}&quot;</code>)}
            </div>
          </div>
        );
      })}
      {!visible.length && normalizedQuery && <ModuleEmpty />}
      {!enabledOnly && <Button variant="outline" className="module-add-button" onClick={() => onChange({ ...document, multiBinds: [...document.multiBinds, createMultiBind()] })}><Plus size={16} />{t("Double-Bind hinzufügen")}</Button>}
    </div>
  );
}

function CustomBindsModuleComponent({ document, query, onChange, enabledOnly = false }: ModuleProps) {
  const { t } = useTranslation();
  const normalizedQuery = query.trim().toLowerCase();
  const conflicts = findBindingConflicts(document);
  const visible = document.customBinds.filter((binding) => (!enabledOnly || binding.enabled) &&
    (!normalizedQuery || `${binding.label} ${t(binding.label)} ${binding.key} ${binding.command}`.toLowerCase().includes(normalizedQuery)));

  function update(id: string, patch: Partial<CustomBind>) {
    onChange({ ...document, customBinds: document.customBinds.map((binding) => binding.id === id ? { ...binding, ...patch } : binding) });
  }

  return (
    <div className="bind-module-stack">
      <div className="module-notice"><KeyRound size={18} /><div><strong>{t("Freie Einzelaktion")}</strong><p>{t("Command und Argumente sind erlaubt. Mehrere Aktionen mit Semikolon werden aus Sicherheitsgründen abgelehnt.")}</p></div></div>
      {visible.map((binding) => {
        const error = binding.enabled ? validateCustomCommand(binding.command) : null;
        const conflict = binding.enabled && conflicts.has(sanitizeKey(binding.key));
        return (
          <div className={`builder-card custom-builder ${binding.enabled ? "is-enabled" : ""} ${error ? "has-error" : ""}`} key={binding.id}>
            <div className="builder-card-head">
              <EnableButton enabled={binding.enabled} onClick={() => update(binding.id, { enabled: !binding.enabled })} />
              <Input className="builder-title-input" value={t(binding.label)} maxLength={50} aria-label={t("Name des Custom-Binds")} onChange={(event) => update(binding.id, { label: event.target.value })} />
              <Button variant="outline" size="icon" className="icon-button danger-button" onClick={() => onChange({ ...document, customBinds: document.customBinds.filter((item) => item.id !== binding.id) })} aria-label={t("Custom-Bind löschen")}><Trash2 size={15} /></Button>
            </div>
            <div className="custom-bind-fields">
              <label>{t("Taste")}<KeyInput value={binding.key} conflict={conflict} onChange={(key) => update(binding.id, { key })} /></label>
              <label>{t("Console-Command")}<Input className={error ? "input-error" : ""} value={binding.command} maxLength={160} placeholder={t("z. B. say_team A execute")} onChange={(event) => update(binding.id, { command: event.target.value })} /></label>
            </div>
            {(error || conflict) && <div className="builder-error"><AlertTriangle size={14} />{error ? t(error) : t("Diese Taste ist bereits mit einer anderen Aktion belegt")}</div>}
            {!error && binding.key && binding.command && <div className="bind-output-preview"><code>bind &quot;{sanitizeKey(binding.key)}&quot; &quot;{binding.command.trim()}&quot;</code></div>}
          </div>
        );
      })}
      {!visible.length && normalizedQuery && <ModuleEmpty />}
      {!enabledOnly && <Button variant="outline" className="module-add-button" onClick={() => onChange({ ...document, customBinds: [...document.customBinds, createCustomBind()] })}><Plus size={16} />{t("Custom-Bind hinzufügen")}</Button>}
    </div>
  );
}

function EnableButton({ enabled, onClick }: { enabled: boolean; onClick: () => void }) {
  const { t } = useTranslation();
  return <Checkbox className="enable-check" checked={enabled} onCheckedChange={onClick} aria-label={enabled ? t("Deaktivieren") : t("Aktivieren")} />;
}

function KeyInput({ value, conflict, onChange }: { value: string; conflict?: boolean; onChange: (value: string) => void }) {
  const { t } = useTranslation();
  return (
    <div className={`key-input ${conflict ? "conflict" : ""}`}>
      <KeyRound size={14} />
      <Input list="cs2-key-suggestions" value={value} maxLength={24} placeholder={t("Taste")} onChange={(event) => onChange(sanitizeKey(event.target.value))} />
      <datalist id="cs2-key-suggestions">{keySuggestions.map((key) => <option key={key} value={key} />)}</datalist>
    </div>
  );
}

function ModuleEmpty() {
  const { t } = useTranslation();
  return <div className="module-empty">{t("Keine passenden Binds in diesem Modul.")}</div>;
}

function equalBindingProps(previous: ModuleProps, next: ModuleProps) {
  return previous.query === next.query &&
    previous.enabledOnly === next.enabledOnly &&
    previous.onChange === next.onChange &&
    previous.document.standardBinds === next.document.standardBinds &&
    previous.document.multiBinds === next.document.multiBinds &&
    previous.document.customBinds === next.document.customBinds;
}

// Command value changes keep all bind arrays by reference. Avoid rebuilding
// conflict maps and every bind card when an unrelated setting moves.
export const StandardBindsModule = memo(StandardBindsModuleComponent, equalBindingProps);
export const MultiBindsModule = memo(MultiBindsModuleComponent, equalBindingProps);
export const CustomBindsModule = memo(CustomBindsModuleComponent, equalBindingProps);
