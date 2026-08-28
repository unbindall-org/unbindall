"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LoaderCircle, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  catalogConfigTypes,
  categoryIds,
  commandCatalogInputSchema,
  commandControlTypes,
  commandPreviews,
  commandRestrictions,
  commandVerificationStates,
  type CommandCatalogInput,
  type CommandCatalogRecord,
} from "@/features/generator/catalog/model";
import { useTRPC } from "@/trpc/client";

type Draft = {
  name: string;
  category: CommandCatalogInput["category"];
  type: CommandCatalogInput["type"];
  labelDe: string;
  labelEn: string;
  descriptionDe: string;
  descriptionEn: string;
  defaultValue: string;
  enabledByDefault: boolean;
  min: string;
  max: string;
  step: string;
  unit: string;
  options: string;
  preview: "none" | NonNullable<CommandCatalogInput["preview"]>;
  verification: CommandCatalogInput["verification"];
  restrictions: CommandCatalogInput["restrictions"];
  checkedVersion: string;
  configTypes: CommandCatalogInput["configTypes"];
  sortOrder: string;
  published: boolean;
};

const emptyDraft: Draft = {
  name: "",
  category: "mouse",
  type: "toggle",
  labelDe: "",
  labelEn: "",
  descriptionDe: "",
  descriptionEn: "",
  defaultValue: "false",
  enabledByDefault: false,
  min: "",
  max: "",
  step: "",
  unit: "",
  options: "[]",
  preview: "none",
  verification: "verified",
  restrictions: [],
  checkedVersion: "",
  configTypes: ["matchmaking"],
  sortOrder: "0",
  published: false,
};

export function CommandCatalogAdmin() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const catalogQuery = useQuery(trpc.catalog.admin.queryOptions());
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<CommandCatalogRecord | null | undefined>(undefined);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [formError, setFormError] = useState("");

  const acceptSnapshot = async (snapshot: Awaited<ReturnType<typeof catalogQuery.refetch>>["data"]) => {
    if (snapshot) queryClient.setQueryData(trpc.catalog.admin.queryKey(), snapshot);
    await queryClient.invalidateQueries({ queryKey: trpc.catalog.public.queryKey() });
    setEditing(undefined);
  };
  const createMutation = useMutation(trpc.catalog.create.mutationOptions({
    onSuccess: acceptSnapshot,
    onError: (error) => setFormError(error.message),
  }));
  const updateMutation = useMutation(trpc.catalog.update.mutationOptions({
    onSuccess: acceptSnapshot,
    onError: (error) => setFormError(error.message),
  }));
  const removeMutation = useMutation(trpc.catalog.remove.mutationOptions({
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: trpc.catalog.admin.queryKey() }),
        queryClient.invalidateQueries({ queryKey: trpc.catalog.public.queryKey() }),
      ]);
      toast.success("Command gelöscht.");
    },
    onError: (error) => toast.error(error.message),
  }));

  const commands = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return (catalogQuery.data?.commands ?? []).filter((command) => !normalized || [
      command.name,
      command.label.de,
      command.label.en,
      command.category,
    ].join(" ").toLowerCase().includes(normalized));
  }, [catalogQuery.data, query]);

  function openCreate() {
    const lastOrder = catalogQuery.data?.commands.at(-1)?.sortOrder ?? -1;
    setDraft({ ...emptyDraft, checkedVersion: catalogQuery.data?.commands[0]?.status.checkedVersion ?? "", sortOrder: String(lastOrder + 1) });
    setFormError("");
    setEditing(null);
  }

  function openEdit(command: CommandCatalogRecord) {
    setDraft(toDraft(command));
    setFormError("");
    setEditing(command);
  }

  function submit() {
    setFormError("");
    let defaultValue: unknown;
    let options: unknown;
    try {
      defaultValue = JSON.parse(draft.defaultValue);
      options = JSON.parse(draft.options);
    } catch {
      setFormError("Standardwert und Optionen müssen gültiges JSON sein.");
      return;
    }
    const candidate = commandCatalogInputSchema.safeParse({
      name: draft.name,
      category: draft.category,
      type: draft.type,
      label: { de: draft.labelDe, en: draft.labelEn },
      description: { de: draft.descriptionDe, en: draft.descriptionEn },
      defaultValue,
      enabledByDefault: draft.enabledByDefault,
      min: optionalNumber(draft.min),
      max: optionalNumber(draft.max),
      step: optionalNumber(draft.step),
      unit: draft.unit || undefined,
      options,
      preview: draft.preview === "none" ? undefined : draft.preview,
      verification: draft.verification,
      restrictions: draft.restrictions,
      checkedVersion: draft.checkedVersion,
      configTypes: draft.configTypes,
      sortOrder: Number(draft.sortOrder),
      published: draft.published,
    });
    if (!candidate.success) {
      setFormError(candidate.error.issues[0]?.message ?? "Ungültige Eingaben.");
      return;
    }
    if (editing) updateMutation.mutate({ id: editing.id, expectedRevision: editing.revision, command: candidate.data });
    else createMutation.mutate(candidate.data);
  }

  const pending = createMutation.isPending || updateMutation.isPending;

  return (
    <section className="role-card command-admin-card">
      <div className="role-card-head command-admin-head">
        <div><strong>Command-Katalog</strong><p>Veröffentlichte Definitionen stehen allen Generatoren als gecachter DB-Snapshot zur Verfügung.</p></div>
        <Button size="sm" onClick={openCreate}><Plus size={15} />Command anlegen</Button>
      </div>
      <div className="command-admin-search"><Search size={16} /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Commands durchsuchen …" /></div>
      {catalogQuery.isPending ? (
        <p className="role-loading"><LoaderCircle className="spin" size={16} />Katalog wird geladen …</p>
      ) : (
        <div className="role-table-wrap">
          <table className="role-table command-admin-table">
            <thead><tr><th>Command</th><th>Typ</th><th>Verfügbarkeit</th><th>Status</th><th /></tr></thead>
            <tbody>{commands.map((command) => (
              <tr key={command.id}>
                <td><code>{command.name}</code><small>{command.label.de} · {command.label.en}</small></td>
                <td>{command.category}<small>{command.type}</small></td>
                <td><small>{command.configTypes.join(", ")}</small></td>
                <td><span className={`command-status ${command.published ? "is-verified" : "is-deprecated"}`}>{command.published ? "Veröffentlicht" : "Entwurf"}</span></td>
                <td className="command-admin-actions">
                  <Button size="icon-sm" variant="ghost" onClick={() => openEdit(command)} aria-label={`${command.name} bearbeiten`}><Pencil size={15} /></Button>
                  <Button size="icon-sm" variant="ghost" disabled={command.published || removeMutation.isPending} onClick={() => removeMutation.mutate({ id: command.id })} aria-label={`${command.name} löschen`}><Trash2 size={15} /></Button>
                </td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}

      <Dialog open={editing !== undefined} onOpenChange={(open) => { if (!open) setEditing(undefined); }}>
        <DialogContent className="command-editor-dialog">
          <DialogHeader><DialogTitle>{editing ? `${editing.name} bearbeiten` : "Command anlegen"}</DialogTitle><DialogDescription>Alle Werte werden vor dem Schreiben client- und serverseitig validiert.</DialogDescription></DialogHeader>
          <div className="command-editor-grid">
            <Field label="Command-Name"><Input value={draft.name} disabled={Boolean(editing?.published)} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></Field>
            <Field label="Kategorie"><EnumSelect value={draft.category} values={categoryIds} onChange={(category) => setDraft({ ...draft, category })} /></Field>
            <Field label="Control-Typ"><EnumSelect value={draft.type} values={commandControlTypes} onChange={(type) => setDraft({ ...draft, type })} /></Field>
            <Field label="Sortierung"><Input type="number" min={0} value={draft.sortOrder} onChange={(event) => setDraft({ ...draft, sortOrder: event.target.value })} /></Field>
            <Field label="Label Deutsch"><Input value={draft.labelDe} onChange={(event) => setDraft({ ...draft, labelDe: event.target.value })} /></Field>
            <Field label="Label Englisch"><Input value={draft.labelEn} onChange={(event) => setDraft({ ...draft, labelEn: event.target.value })} /></Field>
            <Field label="Beschreibung Deutsch" wide><textarea value={draft.descriptionDe} onChange={(event) => setDraft({ ...draft, descriptionDe: event.target.value })} /></Field>
            <Field label="Beschreibung Englisch" wide><textarea value={draft.descriptionEn} onChange={(event) => setDraft({ ...draft, descriptionEn: event.target.value })} /></Field>
            <Field label="Standardwert (JSON)"><Input value={draft.defaultValue} onChange={(event) => setDraft({ ...draft, defaultValue: event.target.value })} /></Field>
            <Field label="Einheit"><Input value={draft.unit} onChange={(event) => setDraft({ ...draft, unit: event.target.value })} /></Field>
            <Field label="Minimum"><Input type="number" value={draft.min} onChange={(event) => setDraft({ ...draft, min: event.target.value })} /></Field>
            <Field label="Maximum"><Input type="number" value={draft.max} onChange={(event) => setDraft({ ...draft, max: event.target.value })} /></Field>
            <Field label="Schrittweite"><Input type="number" value={draft.step} onChange={(event) => setDraft({ ...draft, step: event.target.value })} /></Field>
            <Field label="Preview"><EnumSelect value={draft.preview} values={["none", ...commandPreviews]} onChange={(preview) => setDraft({ ...draft, preview })} /></Field>
            <Field label="Prüfstatus"><EnumSelect value={draft.verification} values={commandVerificationStates} onChange={(verification) => setDraft({ ...draft, verification })} /></Field>
            <Field label="Geprüfter Build"><Input value={draft.checkedVersion} onChange={(event) => setDraft({ ...draft, checkedVersion: event.target.value })} /></Field>
            <Field label="Select-Optionen (JSON)" wide><textarea className="is-code" value={draft.options} onChange={(event) => setDraft({ ...draft, options: event.target.value })} /></Field>
            <CheckboxGroup label="Config-Arten" values={catalogConfigTypes} selected={draft.configTypes} onChange={(configTypes) => setDraft({ ...draft, configTypes })} />
            <CheckboxGroup label="Einschränkungen" values={commandRestrictions} selected={draft.restrictions} onChange={(restrictions) => setDraft({ ...draft, restrictions })} />
            <div className="command-editor-flags">
              <CheckLabel checked={draft.enabledByDefault} onChange={(enabledByDefault) => setDraft({ ...draft, enabledByDefault })}>Standardmäßig aktiv</CheckLabel>
              <CheckLabel checked={draft.published} onChange={(published) => setDraft({ ...draft, published })}>Veröffentlicht</CheckLabel>
            </div>
          </div>
          {formError && <p className="command-editor-error">{formError}</p>}
          <DialogFooter><Button variant="outline" onClick={() => setEditing(undefined)}>Abbrechen</Button><Button disabled={pending} onClick={submit}>{pending && <LoaderCircle className="spin" size={15} />}Speichern</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

function Field({ label, wide, children }: { label: string; wide?: boolean; children: React.ReactNode }) {
  return <Label className={`command-editor-field ${wide ? "is-wide" : ""}`}><span>{label}</span>{children}</Label>;
}

function EnumSelect<T extends string>({ value, values, onChange }: { value: T; values: readonly T[]; onChange: (value: T) => void }) {
  return <Select value={value} onValueChange={(next) => onChange(next as T)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{values.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select>;
}

function CheckLabel({ checked, onChange, children }: { checked: boolean; onChange: (checked: boolean) => void; children: React.ReactNode }) {
  return <Label><Checkbox checked={checked} onCheckedChange={(value) => onChange(value === true)} />{children}</Label>;
}

function CheckboxGroup<T extends string>({ label, values, selected, onChange }: { label: string; values: readonly T[]; selected: T[]; onChange: (values: T[]) => void }) {
  return <fieldset className="command-editor-checks"><legend>{label}</legend>{values.map((value) => <CheckLabel key={value} checked={selected.includes(value)} onChange={(checked) => onChange(checked ? [...selected, value] : selected.filter((item) => item !== value))}>{value}</CheckLabel>)}</fieldset>;
}

function optionalNumber(value: string) {
  return value === "" ? undefined : Number(value);
}

function toDraft(command: CommandCatalogRecord): Draft {
  return {
    name: command.name,
    category: command.category,
    type: command.type,
    labelDe: command.label.de,
    labelEn: command.label.en,
    descriptionDe: command.description.de,
    descriptionEn: command.description.en,
    defaultValue: JSON.stringify(command.defaultValue),
    enabledByDefault: command.enabledByDefault,
    min: command.min === undefined ? "" : String(command.min),
    max: command.max === undefined ? "" : String(command.max),
    step: command.step === undefined ? "" : String(command.step),
    unit: command.unit ?? "",
    options: JSON.stringify(command.options, null, 2),
    preview: command.preview ?? "none",
    verification: command.status.verification,
    restrictions: command.status.restrictions,
    checkedVersion: command.status.checkedVersion,
    configTypes: command.configTypes,
    sortOrder: String(command.sortOrder),
    published: command.published,
  };
}
