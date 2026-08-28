"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { inferRouterOutputs } from "@trpc/server";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { useTranslation } from "react-i18next";
import {
  Check,
  ChevronDown,
  Clipboard,
  Cloud,
  Braces,
  Copy,
  Crosshair,
  Download,
  FileCode2,
  FolderOpen,
  Gauge,
  Gamepad2,
  Headphones,
  History,
  Import,
  Info,
  Keyboard,
  LoaderCircle,
  LogIn,
  LogOut,
  Menu,
  MousePointer2,
  PanelTop,
  Radar,
  Rocket,
  Server,
  FlaskConical,
  RotateCcw,
  Save,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
  Undo2,
  User,
  X,
} from "lucide-react";
import { toast } from "sonner";
import type { Session } from "next-auth";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  bindActions,
  commands,
  presets,
} from "../catalog/commands";
import { parseConfigFiles, serializeConfig } from "../domain/codec";
import { createDefaultDocument, normalizeDocument } from "@/features/generator/domain/document";
import { findBindingConflicts, resolveBindings } from "@/features/generator/domain/bindings";
import type { ConfigType, GeneratorDocument } from "@/features/generator/domain/types";
import { configTypes, configTypeUsesBinds, defaultConfigName, getConfigTypeDefinition, isCommandAvailable, presetsForConfigType } from "@/features/generator/domain/config-types";
import { generatorModules, moduleCount, moduleDocumentItemCount, type GeneratorModule, type GeneratorModuleId } from "@/features/generator/modules/registry";
import { CustomBindsModule, MultiBindsModule, StandardBindsModule } from "@/features/generator/components/bind-modules";
import { AccountDialog } from "@/features/auth/components/account-dialog";
import { AuthDialog } from "@/features/auth/components/auth-dialog";
import { LanguageSwitcher } from "@/components/language-switcher";
import { CommandControl } from "./command-control";
import { ConfigCode } from "./config-code";
import { Logo } from "@/components/logo";
import { useTRPC } from "@/trpc/client";
import type { AppRouter } from "@/trpc/router";
import { CrosshairPreview, RadarPreview, ViewmodelPreview } from "./previews";
import { getPendingAutosave, putPendingAutosave, removePendingAutosave, type PendingAutosave } from "../persistence/autosave-store";

type UserShape = Session["user"] | null;
export type AuthProviders = { discord: boolean; steam: boolean };
type SavedConfig = inferRouterOutputs<AppRouter>["config"]["list"][number];
type TrashedConfig = inferRouterOutputs<AppRouter>["config"]["trash"][number];
type SyncStatus = "local" | "dirty" | "syncing" | "saved" | "offline" | "conflict";

const categoryIcons = {
  mouse: MousePointer2,
  crosshair: Crosshair,
  viewmodel: Gamepad2,
  radar: Radar,
  audio: Headphones,
  hud: PanelTop,
  performance: Gauge,
  server: Server,
  practice: FlaskConical,
  "launch-options": Rocket,
  binds: Keyboard,
  "multi-binds": Copy,
  "custom-binds": Braces,
};

export function GeneratorApp({ user, authProviders }: { user: UserShape; authProviders: AuthProviders }) {
  const { t, i18n } = useTranslation();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const configsQuery = useQuery(trpc.config.list.queryOptions(undefined, {
    enabled: Boolean(user),
    retry: false,
  }));
  const createConfigMutation = useMutation(trpc.config.create.mutationOptions());
  const saveConfigMutation = useMutation(trpc.config.save.mutationOptions());
  const { mutateAsync: autosaveConfig } = useMutation(trpc.config.autosave.mutationOptions());
  const deleteConfigMutation = useMutation(trpc.config.delete.mutationOptions());
  const restoreMutation = useMutation(trpc.config.restore.mutationOptions());
  const undeleteMutation = useMutation(trpc.config.undelete.mutationOptions());
  const permanentDeleteMutation = useMutation(trpc.config.permanentDelete.mutationOptions());
  const [generatorDocument, setGeneratorDocument] = useState<GeneratorDocument>(createDefaultDocument);
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<"all" | GeneratorModuleId>("all");
  const [authOpen, setAuthOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [historyConfig, setHistoryConfig] = useState<SavedConfig | null>(null);
  const [recoveryTime, setRecoveryTime] = useState("");
  const [deleteCandidate, setDeleteCandidate] = useState<SavedConfig | null>(null);
  const [permanentDeleteCandidate, setPermanentDeleteCandidate] = useState<TrashedConfig | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [currentRevision, setCurrentRevision] = useState(0);
  const [cloudReady, setCloudReady] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(user ? "saved" : "local");
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [configName, setConfigName] = useState(() => t(defaultConfigName("matchmaking")));
  const [checkpointLabel, setCheckpointLabel] = useState("");
  const [draftHydrated, setDraftHydrated] = useState(false);
  const [copied, setCopied] = useState(false);
  const trashQuery = useQuery(trpc.config.trash.queryOptions(undefined, {
    enabled: Boolean(user) && libraryOpen,
    retry: false,
  }));
  const historyQuery = useQuery(trpc.config.history.queryOptions({
    id: historyConfig?.id ?? "00000000-0000-0000-0000-000000000000",
    limit: 100,
  }, {
    enabled: Boolean(historyConfig),
    retry: false,
  }));
  const importRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const currentRevisionRef = useRef(0);
  const lastSyncedFingerprintRef = useRef("");
  const dirtySinceRef = useRef<number | null>(null);
  const autosaveInFlightRef = useRef(false);
  const latestFingerprintRef = useRef("");
  const [onlineRetry, setOnlineRetry] = useState(0);
  const [sliderActive, setSliderActive] = useState(false);
  const savedConfigs = configsQuery.data ?? [];
  const configsLoading = Boolean(user) && configsQuery.isPending;

  const localizedCommands = useMemo(() => commands.map((command) => ({
    ...command,
    label: t(command.label),
    description: t(command.description),
    options: command.options?.map((option) => ({ ...option, label: t(option.label) })),
  })), [t]);
  const localizedModules = useMemo(() => generatorModules.map((module) => ({
    ...module,
    label: t(module.label),
    shortLabel: t(module.shortLabel),
    description: t(module.description),
    searchableText: `${module.searchableText} ${t(module.label)} ${t(module.shortLabel)} ${t(module.description)} ${bindActions.map((action) => `${t(action.label)} ${t(action.group)}`).join(" ")}`.toLowerCase(),
  })), [t]);
  const localizedPresets = useMemo(() => presets.map((preset) => ({
    ...preset, label: t(preset.label), description: t(preset.description),
  })), [t]);
  const localizedConfigTypes = useMemo(() => configTypes.map((type) => ({
    ...type, label: t(type.label), description: t(type.description),
  })), [t]);
  const availableModules = useMemo(() => localizedModules.filter((module) => module.kind === "settings"
    ? localizedCommands.some((command) => command.category === module.id && isCommandAvailable(generatorDocument.configType, command))
    : configTypeUsesBinds(generatorDocument.configType)), [generatorDocument.configType, localizedCommands, localizedModules]);
  const availablePresets = useMemo(() => {
    const names = presetsForConfigType(generatorDocument.configType);
    return localizedPresets.filter((preset) => names.has(preset.name));
  }, [generatorDocument.configType, localizedPresets]);
  const configDefinition = getConfigTypeDefinition(generatorDocument.configType);
  const rawConfig = useMemo(() => serializeConfig(generatorDocument, i18n.resolvedLanguage === "en" ? "en" : "de"), [generatorDocument, i18n.resolvedLanguage]);
  const documentFingerprint = useMemo(
    () => JSON.stringify({ name: configName, values: generatorDocument }),
    [configName, generatorDocument],
  );
  const normalizedQuery = query.trim().toLowerCase();
  const overviewMode = activeCategory === "all";
  const enabledCount = localizedCommands.filter((command) => isCommandAvailable(generatorDocument.configType, command) && generatorDocument.commandValues[`enabled:${command.name}`]).length +
    (configTypeUsesBinds(generatorDocument.configType) ? resolveBindings(generatorDocument).length : 0);
  const activeModules = useMemo(
    () => availableModules.filter((module) => module.kind === "settings"
      ? localizedCommands.some((command) => command.category === module.id && isCommandAvailable(generatorDocument.configType, command) && generatorDocument.commandValues[`enabled:${command.name}`])
      : moduleDocumentItemCount(module, generatorDocument, true) > 0),
    [availableModules, generatorDocument, localizedCommands],
  );
  const settingsModules = availableModules.filter((module) => module.kind === "settings");
  const bindModules = availableModules.filter((module) => module.kind !== "settings");
  const lineCount = rawConfig ? rawConfig.split("\n").length : 0;
  const syncLabel = syncStatus === "syncing" ? t("Wird synchronisiert …")
    : syncStatus === "dirty" ? t("Änderungen ausstehend")
      : syncStatus === "offline" ? t("Offline gespeichert")
        : syncStatus === "conflict" ? t("Versionskonflikt")
          : syncStatus === "saved" ? t("Automatisch gespeichert")
            : t("Im Browser gespeichert");
  useEffect(() => {
    latestFingerprintRef.current = documentFingerprint;
  }, [documentFingerprint]);

  const updateCachedConfig = useCallback((saved: inferRouterOutputs<AppRouter>["config"]["get"]) => {
    const metadata: SavedConfig = {
      id: saved.id,
      name: saved.name,
      revision: saved.revision,
      createdAt: saved.createdAt,
      updatedAt: saved.updatedAt,
      deletedAt: saved.deletedAt,
    };
    currentRevisionRef.current = saved.revision;
    setCurrentRevision(saved.revision);
    setLastSavedAt(saved.updatedAt);
    queryClient.setQueryData(trpc.config.list.queryKey(), (items: SavedConfig[] | undefined) => [
      metadata,
      ...(items ?? []).filter((item) => item.id !== saved.id),
    ]);
  }, [queryClient, trpc.config.list]);

  const performAutosave = useCallback(async (pending: PendingAutosave) => {
    if (autosaveInFlightRef.current) return;
    if (!navigator.onLine) {
      setSyncStatus("offline");
      return;
    }
    autosaveInFlightRef.current = true;
    setSyncStatus("syncing");
    try {
      const saved = await autosaveConfig({
        id: pending.id,
        expectedRevision: pending.expectedRevision,
        mutationId: pending.mutationId,
        name: pending.name,
        values: pending.values,
        rawConfig: pending.rawConfig,
      });
      const isLatestDocument = latestFingerprintRef.current === pending.fingerprint;
      if (isLatestDocument) {
        lastSyncedFingerprintRef.current = pending.fingerprint;
        dirtySinceRef.current = null;
      }
      updateCachedConfig(saved);
      await removePendingAutosave(pending.id, pending.mutationId).catch(() => undefined);
      setSyncStatus(isLatestDocument ? "saved" : "dirty");
    } catch (error) {
      const code = error && typeof error === "object" && "data" in error
        ? (error.data as { code?: string } | undefined)?.code
        : undefined;
      setSyncStatus(code === "CONFLICT" ? "conflict" : "offline");
      if (code === "CONFLICT") toast.error(t("Autosave-Konflikt erkannt. Dein lokaler Stand wurde nicht überschrieben."));
    } finally {
      autosaveInFlightRef.current = false;
    }
  }, [autosaveConfig, t, updateCachedConfig]);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("authError") === "steam") {
      toast.error(t("Steam-Anmeldung fehlgeschlagen."));
      url.searchParams.delete("authError");
      window.history.replaceState(null, "", url);
    }
  }, [t]);

  useEffect(() => {
    const cached = window.localStorage.getItem("unbindall:draft");
    if (cached) {
      // Hydrate the anonymous draft after the client has mounted.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      try { setGeneratorDocument(normalizeDocument(JSON.parse(cached))); } catch { /* ignore invalid drafts */ }
    }
    const cachedMeta = window.localStorage.getItem("unbindall:draft-meta");
    if (cachedMeta) {
      try {
        const meta = JSON.parse(cachedMeta) as { name?: unknown; currentId?: unknown; revision?: unknown; syncedFingerprint?: unknown };
        if (typeof meta.name === "string") setConfigName(meta.name);
        if (user && typeof meta.currentId === "string") {
          setCurrentId(meta.currentId);
          if (typeof meta.revision === "number") {
            setCurrentRevision(meta.revision);
            currentRevisionRef.current = meta.revision;
          }
          if (typeof meta.syncedFingerprint === "string") lastSyncedFingerprintRef.current = meta.syncedFingerprint;
        }
      } catch { /* ignore invalid draft metadata */ }
    }
    setDraftHydrated(true);
  }, [user]);

  useEffect(() => {
    if (!draftHydrated) return;
    window.localStorage.setItem("unbindall:draft", JSON.stringify(generatorDocument));
    window.localStorage.setItem("unbindall:draft-meta", JSON.stringify({
      name: configName,
      currentId,
      revision: currentRevision,
      syncedFingerprint: lastSyncedFingerprintRef.current,
    }));
  }, [configName, currentId, currentRevision, draftHydrated, generatorDocument]);

  useEffect(() => {
    if (!configsQuery.data || !draftHydrated || !currentId) return;
    const current = configsQuery.data.find((config) => config.id === currentId);
    if (!current) {
      // Reconcile the locally remembered id with the authoritative cloud list.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCurrentId(null);
      setCloudReady(false);
      return;
    }
    if (currentRevisionRef.current === 0) {
      currentRevisionRef.current = current.revision;
      setCurrentRevision(current.revision);
    }
    if (current.revision > currentRevisionRef.current && documentFingerprint === lastSyncedFingerprintRef.current) {
      void queryClient.fetchQuery(trpc.config.get.queryOptions({ id: current.id })).then((loaded) => {
        const document = normalizeDocument(loaded.values);
        lastSyncedFingerprintRef.current = JSON.stringify({ name: loaded.name, values: document });
        currentRevisionRef.current = loaded.revision;
        setCurrentRevision(loaded.revision);
        setGeneratorDocument(document);
        setConfigName(loaded.name);
        setLastSavedAt(loaded.updatedAt);
        setSyncStatus("saved");
      }).catch(() => setSyncStatus("offline"));
    }
    setCloudReady(true);
  }, [configsQuery.data, currentId, documentFingerprint, draftHydrated, queryClient, trpc.config.get]);

  useEffect(() => {
    if (configsQuery.error) toast.error(t(configsQuery.error.message));
  }, [configsQuery.error, t]);

  useEffect(() => {
    function retryOnline() {
      setOnlineRetry((value) => value + 1);
    }
    window.addEventListener("online", retryOnline);
    return () => window.removeEventListener("online", retryOnline);
  }, []);

  useEffect(() => {
    if (!user || !draftHydrated || !cloudReady || !currentId) return;
    if (documentFingerprint === lastSyncedFingerprintRef.current) return;

    setSyncStatus(navigator.onLine ? "dirty" : "offline");
    if (dirtySinceRef.current === null) dirtySinceRef.current = Date.now();
    const pending: PendingAutosave = {
      id: currentId,
      expectedRevision: currentRevisionRef.current,
      mutationId: crypto.randomUUID(),
      name: configName,
      values: generatorDocument,
      rawConfig,
      fingerprint: documentFingerprint,
      queuedAt: new Date().toISOString(),
    };
    void putPendingAutosave(pending).catch(() => undefined);
    if (sliderActive) return;
    const elapsed = Date.now() - dirtySinceRef.current;
    const timer = window.setTimeout(() => void performAutosave(pending), Math.max(0, Math.min(1_000, 5_000 - elapsed)));
    return () => window.clearTimeout(timer);
  }, [cloudReady, configName, currentId, currentRevision, documentFingerprint, draftHydrated, generatorDocument, onlineRetry, performAutosave, rawConfig, sliderActive, user]);

  useEffect(() => {
    if (!currentId || !cloudReady || autosaveInFlightRef.current || !navigator.onLine) return;
    void getPendingAutosave(currentId).then((pending) => {
      if (pending && pending.fingerprint === latestFingerprintRef.current) {
        void performAutosave(pending);
      }
    }).catch(() => undefined);
  }, [cloudReady, currentId, onlineRetry, performAutosave]);

  useEffect(() => {
    function focusSearch(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchRef.current?.focus();
      }
    }
    window.addEventListener("keydown", focusSearch);
    return () => window.removeEventListener("keydown", focusSearch);
  }, []);

  function update(name: string, value: string | number | boolean) {
    setGeneratorDocument((current) => {
      const next = { ...current.commandValues, [name]: value };
      if (name === "cl_crosshaircolor" && Number(value) === 5) {
        next["enabled:cl_crosshaircolor_r"] = true;
        next["enabled:cl_crosshaircolor_g"] = true;
        next["enabled:cl_crosshaircolor_b"] = true;
      }
      return { ...current, commandValues: next };
    });
  }

  function moduleMatches(module: GeneratorModule) {
    if (activeCategory !== "all" && activeCategory !== module.id) return false;
    if (overviewMode && moduleDocumentItemCount(module, generatorDocument, true) === 0) return false;
    if (!normalizedQuery) return true;
    if (module.kind !== "settings") {
      const moduleText = overviewMode
        ? `${module.label} ${module.shortLabel} ${module.description}`.toLowerCase()
        : module.searchableText;
      return moduleText.includes(normalizedQuery) || moduleHasItemMatch(module);
    }
    return localizedCommands.some((command) => command.category === module.id &&
      isCommandAvailable(generatorDocument.configType, command) &&
      (!overviewMode || Boolean(generatorDocument.commandValues[`enabled:${command.name}`])) && commandMatches(command));
  }

  function moduleHasItemMatch(module: GeneratorModule) {
    if (module.kind === "standard-binds") return resolveBindings(generatorDocument).some((binding) =>
      binding.source === "standard" && `${binding.label} ${t(binding.label)} ${binding.command} ${binding.key}`.toLowerCase().includes(normalizedQuery));
    if (module.kind === "multi-binds") return generatorDocument.multiBinds.some((binding) =>
      (!overviewMode || binding.enabled) && `${binding.label} ${t(binding.label)} ${binding.keys.join(" ")}`.toLowerCase().includes(normalizedQuery));
    if (module.kind === "custom-binds") return generatorDocument.customBinds.some((binding) =>
      (!overviewMode || binding.enabled) && `${binding.label} ${t(binding.label)} ${binding.command} ${binding.key}`.toLowerCase().includes(normalizedQuery));
    return false;
  }

  function commandMatches(command: (typeof commands)[number]) {
    return `${command.label} ${command.name} ${command.description} ${command.status.verification} ${command.status.restrictions.join(" ")} ${command.status.checkedVersion}`.toLowerCase().includes(normalizedQuery);
  }

  function applyPreset(preset: (typeof presets)[number]) {
    setGeneratorDocument((current) => {
      const next = { ...current.commandValues, ...preset.values };
      for (const name of Object.keys(preset.values)) next[`enabled:${name}`] = true;
      return { ...current, commandValues: next };
    });
    toast.success(t("presetApplied", { name: preset.label }));
  }

  async function copyConfig() {
    await navigator.clipboard.writeText(rawConfig);
    setCopied(true);
    toast.success(t(configDefinition.outputKind === "launch-options" ? "Launch Options kopiert." : "Config kopiert."));
    window.setTimeout(() => setCopied(false), 1800);
  }

  function downloadConfig() {
    const blob = new Blob([rawConfig], { type: "text/plain;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = configDefinition.fileName;
    link.click();
    URL.revokeObjectURL(link.href);
    toast.success(t("configDownloaded", { fileName: configDefinition.fileName }));
  }

  async function importConfig(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (!files.length) return;
    event.target.value = "";
    if (files.length > 10 || files.some((file) => file.size > 100_000) || files.reduce((sum, file) => sum + file.size, 0) > 500_000) {
      return toast.error(t("Die Importdateien sind zu groß."));
    }
    const imports = await Promise.all(files.map(async (file) => ({ name: file.name, source: await file.text() })));
    setGeneratorDocument((current) => parseConfigFiles(imports, current));
    setCurrentId(null);
    setCurrentRevision(0);
    currentRevisionRef.current = 0;
    setCloudReady(false);
    if (files.length === 1) setConfigName(files[0].name.replace(/\.(cfg|vcfg|kv3|txt)$/i, "") || t("Importierte Config"));
    toast.success(t("configImportSuccess", { count: files.length }));
  }

  function requestSave() {
    if (!user) return setAuthOpen(true);
    setSaveOpen(true);
  }

  async function persistConfig(event: React.FormEvent) {
    event.preventDefault();
    try {
      const mutationId = crypto.randomUUID();
      const saved = currentId
        ? await saveConfigMutation.mutateAsync({
          id: currentId,
          expectedRevision: currentRevisionRef.current,
          mutationId,
          checkpointLabel: checkpointLabel.trim() || undefined,
          name: configName,
          values: generatorDocument,
          rawConfig,
        })
        : await createConfigMutation.mutateAsync({ name: configName, values: generatorDocument, rawConfig, mutationId });
      setCurrentId(saved.id);
      setConfigName(saved.name);
      setCloudReady(true);
      lastSyncedFingerprintRef.current = JSON.stringify({ name: saved.name, values: normalizeDocument(saved.values) });
      dirtySinceRef.current = null;
      setSyncStatus("saved");
      updateCachedConfig(saved);
      await removePendingAutosave(saved.id).catch(() => undefined);
      setCheckpointLabel("");
      setSaveOpen(false);
      toast.success(t("Config im Account gespeichert."));
    } catch (error) {
      toast.error(error instanceof Error ? t(error.message) : t("Speichern fehlgeschlagen."));
    }
  }

  async function openLibrary() {
    if (!user) return setAuthOpen(true);
    setLibraryOpen(true);
    const result = await configsQuery.refetch();
    if (result.error) toast.error(t(result.error.message));
  }

  async function loadConfig(config: SavedConfig) {
    setCloudReady(false);
    try {
      const loaded = await queryClient.fetchQuery(trpc.config.get.queryOptions({ id: config.id }));
      const document = normalizeDocument(loaded.values);
      const fingerprint = JSON.stringify({ name: loaded.name, values: document });
      lastSyncedFingerprintRef.current = fingerprint;
      currentRevisionRef.current = loaded.revision;
      setCurrentRevision(loaded.revision);
      setGeneratorDocument(document);
      setActiveCategory("all");
      setQuery("");
      setCurrentId(loaded.id);
      setConfigName(loaded.name);
      setLastSavedAt(loaded.updatedAt);
      setSyncStatus("saved");
      await removePendingAutosave(loaded.id).catch(() => undefined);
      setCloudReady(true);
      setLibraryOpen(false);
      toast.success(t("configLoaded", { name: loaded.name }));
    } catch (error) {
      toast.error(error instanceof Error ? t(error.message) : t("Config konnte nicht geladen werden."));
    }
  }

  function selectConfig(id: string) {
    const config = savedConfigs.find((item) => item.id === id);
    if (config) void loadConfig(config);
  }

  async function deleteConfig(id: string) {
    try {
      const config = savedConfigs.find((item) => item.id === id);
      if (!config) return;
      await deleteConfigMutation.mutateAsync({ id, expectedRevision: config.revision, mutationId: crypto.randomUUID() });
      queryClient.setQueryData(trpc.config.list.queryKey(), (configs: SavedConfig[] | undefined) =>
        (configs ?? []).filter((config) => config.id !== id));
      await queryClient.invalidateQueries({ queryKey: trpc.config.trash.queryKey() });
      if (currentId === id) {
        setCurrentId(null);
        setCurrentRevision(0);
        currentRevisionRef.current = 0;
        setCloudReady(false);
        setConfigName(t(defaultConfigName(generatorDocument.configType)));
      }
      setDeleteCandidate(null);
      toast.success(t("Config gelöscht."));
    } catch (error) {
      toast.error(error instanceof Error ? t(error.message) : t("Config konnte nicht gelöscht werden."));
    }
  }

  async function restoreRevision(revision: number) {
    if (!historyConfig) return;
    try {
      const historical = await queryClient.fetchQuery(trpc.config.revision.queryOptions({ id: historyConfig.id, revision }));
      const document = normalizeDocument(historical.values);
      const expectedRevision = historyConfig.id === currentId
        ? currentRevisionRef.current
        : (savedConfigs.find((config) => config.id === historyConfig.id)?.revision ?? historyConfig.revision);
      const saved = await restoreMutation.mutateAsync({
        id: historyConfig.id,
        revision,
        expectedRevision,
        mutationId: crypto.randomUUID(),
        rawConfig: serializeConfig(document, i18n.resolvedLanguage === "en" ? "en" : "de"),
      });
      setGeneratorDocument(document);
      setConfigName(saved.name);
      setCurrentId(saved.id);
      setCloudReady(true);
      lastSyncedFingerprintRef.current = JSON.stringify({ name: saved.name, values: document });
      updateCachedConfig(saved);
      await removePendingAutosave(saved.id).catch(() => undefined);
      setSyncStatus("saved");
      setHistoryConfig(null);
      setLibraryOpen(false);
      toast.success(t("Revision wiederhergestellt."));
    } catch (error) {
      toast.error(error instanceof Error ? t(error.message) : t("Revision konnte nicht wiederhergestellt werden."));
    }
  }

  async function restoreAtTime(event: React.FormEvent) {
    event.preventDefault();
    if (!historyConfig || !recoveryTime) return;
    try {
      const target = await queryClient.fetchQuery(trpc.config.at.queryOptions({
        id: historyConfig.id,
        time: new Date(recoveryTime).toISOString(),
      }));
      await restoreRevision(target.revision);
    } catch (error) {
      toast.error(error instanceof Error ? t(error.message) : t("Zu diesem Zeitpunkt wurde kein Stand gefunden."));
    }
  }

  async function undeleteConfig(config: TrashedConfig) {
    try {
      await undeleteMutation.mutateAsync({ id: config.id, expectedRevision: config.revision, mutationId: crypto.randomUUID() });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: trpc.config.list.queryKey() }),
        queryClient.invalidateQueries({ queryKey: trpc.config.trash.queryKey() }),
      ]);
      toast.success(t("Config aus dem Papierkorb wiederhergestellt."));
    } catch (error) {
      toast.error(error instanceof Error ? t(error.message) : t("Config konnte nicht wiederhergestellt werden."));
    }
  }

  async function permanentlyDeleteConfig(config: TrashedConfig) {
    try {
      await permanentDeleteMutation.mutateAsync({ id: config.id });
      queryClient.setQueryData(trpc.config.trash.queryKey(), (items: TrashedConfig[] | undefined) =>
        (items ?? []).filter((item) => item.id !== config.id));
      setPermanentDeleteCandidate(null);
      toast.success(t("Config endgültig gelöscht."));
    } catch (error) {
      toast.error(error instanceof Error ? t(error.message) : t("Config konnte nicht endgültig gelöscht werden."));
    }
  }

  const conflictingKeys = useMemo(() => findBindingConflicts(generatorDocument), [generatorDocument]);

  function selectCategory(category: "all" | GeneratorModuleId) {
    setActiveCategory(category);
    setMobileNavOpen(false);
  }

  function resetDocument() {
    setGeneratorDocument(createDefaultDocument(generatorDocument.configType));
    setCurrentId(null);
    setCurrentRevision(0);
    currentRevisionRef.current = 0;
    setCloudReady(false);
    toast.success(t("Standardwerte wiederhergestellt."));
  }

  function selectConfigType(configType: ConfigType) {
    if (configType === generatorDocument.configType) return;
    setGeneratorDocument(createDefaultDocument(configType));
    setConfigName(t(defaultConfigName(configType)));
    setCurrentId(null);
    setCurrentRevision(0);
    currentRevisionRef.current = 0;
    setCloudReady(false);
    setActiveCategory("all");
    setQuery("");
    toast.success(t("configTypeSelected", { type: t(getConfigTypeDefinition(configType).label) }));
  }

  function NavItem({ module }: { module: GeneratorModule }) {
    const Icon = categoryIcons[module.id];
    const count = module.kind === "settings"
      ? localizedCommands.filter((command) => command.category === module.id && isCommandAvailable(generatorDocument.configType, command)).length
      : moduleCount(module) ?? moduleDocumentItemCount(module, generatorDocument);
    return (
      <Button variant="ghost" className={`nav-item ${activeCategory === module.id ? "active" : ""}`} onClick={() => selectCategory(module.id)}>
        <Icon size={17} /><span>{module.shortLabel}</span><span className="nav-count">{count}</span>
      </Button>
    );
  }

  return (
    <div
      className="app-shell"
      onPointerDownCapture={(event) => {
        if ((event.target as HTMLElement).closest('[data-slot="slider"]')) setSliderActive(true);
      }}
      onPointerUpCapture={() => setSliderActive(false)}
      onPointerCancelCapture={() => setSliderActive(false)}
    >
      <header className="topbar">
        <div className="brand">
          <div className="brand-symbol"><Logo size={34} /></div>
          <div className="brand-text"><strong>UNBINDALL</strong><span>CS2 CONFIG</span></div>
        </div>

        <div className="topbar-center">
          <span className="status-chip"><span className="status-dot" /><span>{t("entriesActive", { count: enabledCount })}</span></span>
          {currentId && <span className={`status-chip is-cloud sync-${syncStatus}`} title={lastSavedAt ? new Date(lastSavedAt).toLocaleString() : undefined}><Cloud size={14} /><span>{configName} · {syncLabel}</span></span>}
        </div>

        <div className="topbar-actions">
          <div className="topbar-language"><LanguageSwitcher /></div>
          {user ? (
            <>
              <span className="topbar-divider" />
              <div className="config-picker">
                <Cloud size={15} />
                <Select value={currentId ?? undefined} disabled={configsLoading} onValueChange={(id) => selectConfig(id)}>
                  <SelectTrigger aria-label={t("Aktive Config auswählen")}>
                    <SelectValue>{currentId ? configName : savedConfigs.length ? t("Cloud-Config auswählen") : t("Noch keine Cloud-Config")}</SelectValue>
                  </SelectTrigger>
                  <SelectContent align="end" position="popper">
                    {savedConfigs.map((config) => <SelectItem key={config.id} value={config.id}>{config.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                {configsLoading && <LoaderCircle className="spin" size={14} />}
              </div>
              <Button variant="outline" className="ghost-button desktop-action" onClick={openLibrary}><FolderOpen size={16} />{t("Verwalten")}</Button>
              <Button className="primary-button" onClick={requestSave}><Save size={16} />{t("Speichern")}</Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="avatar-button" aria-label={t("Benutzermenü")}>
                    <User size={17} /><ChevronDown size={13} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="user-popover" align="end">
                  <DropdownMenuLabel><strong>{user.name}</strong><span>{user.email ?? t("Verknüpfter OAuth-Account")}</span></DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setAccountOpen(true)}><ShieldCheck size={14} />{t("Account & Daten")}</DropdownMenuItem>
                  <DropdownMenuItem variant="destructive" onClick={() => signOut()}><LogOut size={14} />{t("Abmelden")}</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <div className="browser-save-note"><Info size={15} /><span><strong>{t("Im Browser gespeichert")}</strong><small>{t("Login nur für Cloud-Speicherung")}</small></span></div>
              <Button variant="outline" className="ghost-button login-button" onClick={() => setAuthOpen(true)}><LogIn size={16} />{t("Anmelden")}</Button>
            </>
          )}
          <Button variant="outline" size="icon" className="icon-button mobile-menu-button" onClick={() => setMobileNavOpen(!mobileNavOpen)} aria-label={t("Navigation öffnen")}><Menu size={19} /></Button>
        </div>
      </header>

      <aside className={`sidebar ${mobileNavOpen ? "mobile-open" : ""}`}>
        <div className="sidebar-mobile-head">
          <strong>{t("Bereiche")}</strong>
          <div>
            <span className="sidebar-language"><LanguageSwitcher /></span>
            <Button variant="outline" size="icon" className="icon-button" onClick={() => setMobileNavOpen(false)} aria-label={t("Navigation schließen")}><X size={18} /></Button>
          </div>
        </div>

        <nav className="sidebar-nav">
          <Button variant="ghost" className={`nav-item ${activeCategory === "all" ? "active" : ""}`} onClick={() => selectCategory("all")}>
            <SlidersHorizontal size={17} /><span>{t("Aktuelle Config")}</span><span className="nav-count">{activeModules.length}</span>
          </Button>

          <p className="nav-group-label">{t("EINSTELLUNGEN")}</p>
          {settingsModules.map((module) => <NavItem key={module.id} module={module} />)}

          <p className="nav-group-label">{t("BIND-MODULE")}</p>
          {bindModules.map((module) => <NavItem key={module.id} module={module} />)}
        </nav>

        {availablePresets.length > 0 && <div className="sidebar-presets">
          <p className="eyebrow">{t("SCHNELLSTART")}</p>
          {availablePresets.map((preset) => (
            <Button variant="ghost" className="preset-button" key={preset.name} onClick={() => applyPreset(preset)}>
              <strong>{preset.label}</strong><small>{preset.description}</small>
            </Button>
          ))}
        </div>}

        <div className="sidebar-foot"><FileCode2 size={17} /><p><strong>{t("Kontext-geprüft")}</strong><span>{t("Rechte und Einschränkungen stehen an jedem Command.")}</span></p></div>

        <nav className="sidebar-legal">
          <Link href="/impressum">{t("Impressum")}</Link>
          <Link href="/datenschutz">{t("Datenschutz")}</Link>
        </nav>
        <p className="sidebar-disclaimer">{t("Kein offizielles Valve-Produkt. Counter-Strike und CS2 sind Marken der Valve Corporation.")}</p>
      </aside>

      <main className="workspace">
        <div className="workspace-inner">
          <header className="page-head">
            <p className="eyebrow">{t("DEINE CONFIG. DEINE REGELN.")}</p>
            <div className="page-title-row">
              <div>
                <h1>{overviewMode ? t("Deine aktuelle Config.") : t("Baue dein perfektes Setup.")}</h1>
                <p className="page-lead">{overviewMode
                  ? t("Hier siehst und bearbeitest du nur die Parts, die in deiner ausgewählten Config aktiv sind.")
                  : t("Aktiviere neue Commands und Binds für deine Config. Jede Änderung landet sofort in deiner Ausgabe.")}</p>
              </div>
              <Label className="config-type-select">
                <span>{t("Config-Art")}</span>
                <Select value={generatorDocument.configType} onValueChange={(value) => selectConfigType(value as ConfigType)}>
                  <SelectTrigger aria-label={t("Config-Art auswählen")}><SelectValue>{localizedConfigTypes.find((type) => type.id === generatorDocument.configType)?.label}</SelectValue></SelectTrigger>
                  <SelectContent align="end" position="popper">
                    {localizedConfigTypes.map((type) => <SelectItem key={type.id} value={type.id}>{type.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <small>{localizedConfigTypes.find((type) => type.id === generatorDocument.configType)?.description}</small>
              </Label>
            </div>
          </header>

          <div className="toolbar">
            <div className="search-wrap">
              <Search size={17} />
              <Input ref={searchRef} value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("Command oder Einstellung suchen … z. B. radar, sensitivity, fps_max")} />
              {query
                ? <Button variant="ghost" size="icon-xs" className="search-clear" onClick={() => setQuery("")} aria-label={t("Suche löschen")}><X size={15} /></Button>
                : <kbd>⌘K</kbd>}
            </div>
            <div className="toolbar-actions">
              <Input ref={importRef} type="file" accept=".cfg,.vcfg,.kv3,.txt,text/plain" multiple hidden onChange={importConfig} />
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" className="ghost-button" onClick={() => importRef.current?.click()}><Import size={16} />{t("Config importieren")}</Button>
                </TooltipTrigger>
                <TooltipContent>{t(configDefinition.outputKind === "launch-options" ? "Bestehende Launch Options einlesen" : "CFG-, VCFG- oder KV3-Dateien einlesen")}</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon" className="icon-button" aria-label={t("Auf Standard zurücksetzen")} onClick={resetDocument}><RotateCcw size={16} /></Button>
                </TooltipTrigger>
                <TooltipContent>{t("Auf Standard zurücksetzen")}</TooltipContent>
              </Tooltip>
            </div>
          </div>

          <div className="mobile-category-row">
            <Button variant="outline" className={activeCategory === "all" ? "active" : ""} onClick={() => setActiveCategory("all")}>{t("Aktuelle Config")}</Button>
            {availableModules.map((module) => <Button variant="outline" key={module.id} className={activeCategory === module.id ? "active" : ""} onClick={() => setActiveCategory(module.id)}>{module.shortLabel}</Button>)}
          </div>

          <div className="settings-flow">
            {availableModules.map((module) => {
              if (!moduleMatches(module)) return null;
              const Icon = categoryIcons[module.id];
              const categoryCommands = module.kind === "settings"
                ? localizedCommands.filter((command) => command.category === module.id &&
                  isCommandAvailable(generatorDocument.configType, command) &&
                  (!overviewMode || Boolean(generatorDocument.commandValues[`enabled:${command.name}`])) &&
                  (!normalizedQuery || commandMatches(command)))
                : [];
              const itemCount = module.kind === "settings"
                ? categoryCommands.length
                : moduleDocumentItemCount(module, generatorDocument, overviewMode);
              return (
                <section className="settings-section" key={module.id} id={`section-${module.id}`}>
                  <div className="section-heading">
                    <span className="section-icon"><Icon size={17} /></span>
                    <div className="section-title"><h2>{module.label}</h2><p>{module.description}</p></div>
                    <span className="section-count">{itemCount}</span>
                  </div>

                  {module.id === "crosshair" && !normalizedQuery && (
                    <div className="inline-preview">
                      <CrosshairPreview state={generatorDocument.commandValues} />
                      <div className="preview-copy"><p className="eyebrow">{t("LIVE PREVIEW")}</p><h3>{t("Sieh jede Änderung direkt.")}</h3><p>{t("Größe, Abstand, Farbe, Punkt und Kontur reagieren ohne Verzögerung.")}</p></div>
                    </div>
                  )}
                  {module.id === "viewmodel" && !normalizedQuery && (
                    <div className="inline-preview reverse">
                      <div className="preview-copy"><p className="eyebrow">VIEWMODEL</p><h3>{t("Mehr Sicht auf das Wesentliche.")}</h3><p>{t("Position und FOV werden als räumliche Vorschau angenähert.")}</p></div>
                      <ViewmodelPreview state={generatorDocument.commandValues} />
                    </div>
                  )}
                  {module.id === "radar" && !normalizedQuery && (
                    <div className="inline-preview">
                      <RadarPreview state={generatorDocument.commandValues} />
                      <div className="preview-copy"><p className="eyebrow">{t("RADAR PREVIEW")}</p><h3>{t("Die ganze Runde im Blick.")}</h3><p>{t("Map-Zoom, Rotation und Icon-Größe werden direkt sichtbar.")}</p></div>
                    </div>
                  )}

                  {module.kind === "settings" && <div className="command-list">{categoryCommands.map((command) => <CommandControl key={command.name} command={command} state={generatorDocument.commandValues} onChange={update} />)}</div>}
                  {module.kind === "standard-binds" && <StandardBindsModule document={generatorDocument} query={query} onChange={setGeneratorDocument} enabledOnly={overviewMode} />}
                  {module.kind === "multi-binds" && <MultiBindsModule document={generatorDocument} query={query} onChange={setGeneratorDocument} enabledOnly={overviewMode} />}
                  {module.kind === "custom-binds" && <CustomBindsModule document={generatorDocument} query={query} onChange={setGeneratorDocument} enabledOnly={overviewMode} />}
                </section>
              );
            })}

            {!availableModules.some(moduleMatches) && (
              <div className="empty-state">
                <Search size={26} />
                <h2>{t(normalizedQuery ? (overviewMode ? "Kein aktiver Part gefunden" : "Kein Command gefunden") : (overviewMode ? "Deine Config ist noch leer" : "Keine Inhalte in diesem Bereich"))}</h2>
                <p>{t(normalizedQuery ? (overviewMode ? "Die Suche berücksichtigt in dieser Ansicht nur aktive Inhalte deiner Config." : "Versuche einen anderen Namen oder Console-Command.") : "Wähle links einen Bereich aus und aktiviere deine ersten Einstellungen.")}</p>
                {normalizedQuery
                  ? <Button variant="outline" className="ghost-button" onClick={() => setQuery("")}>{t("Suche löschen")}</Button>
                  : overviewMode && <Button variant="outline" className="ghost-button" onClick={() => setActiveCategory(availableModules[0]?.id ?? "all")}>{t("Bereich auswählen")}</Button>}
              </div>
            )}
          </div>
        </div>
      </main>

      <aside className="config-panel">
        <div className="config-panel-head">
          <div><span className="status-dot" /><strong>{configDefinition.fileName}</strong></div>
          <span>{lineCount} {t("Zeilen")}</span>
        </div>
        <ConfigCode source={rawConfig} />
        {conflictingKeys.size > 0 && <div className="config-warning"><Keyboard size={15} /><span>{t("conflictCount", { count: conflictingKeys.size })}</span></div>}
        <div className="config-panel-actions">
          <Button variant="outline" className="ghost-button" onClick={copyConfig}>{copied ? <Check size={16} /> : <Copy size={16} />}{copied ? t("Kopiert") : t("Kopieren")}</Button>
          <Button className="download-button" onClick={downloadConfig}><Download size={16} />{t("Download")}</Button>
        </div>
        <p className="config-path">{configDefinition.outputKind === "launch-options"
          ? <>{t("In Steam einfügen unter")}<br /><code>{t("Eigenschaften → Allgemein → Startoptionen")}</code></>
          : <>{t("Installiere unter")}<br /><code>…/game/csgo/cfg/{configDefinition.fileName}</code></>}</p>
      </aside>

      <div className="mobile-download-bar"><span>{t("entryCount", { count: enabledCount })}</span><Button className="primary-button" onClick={downloadConfig}><Download size={16} />{configDefinition.fileName}</Button></div>

      <AuthDialog open={authOpen} onClose={() => setAuthOpen(false)} providers={authProviders} />
      {user && <AccountDialog open={accountOpen} onClose={() => setAccountOpen(false)} user={user} />}

      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogContent className="small-dialog">
          <form className="dialog-form" onSubmit={persistConfig}>
            <div className="dialog-icon"><Save size={19} /></div>
            <p className="eyebrow">{t("IN DEINEM ACCOUNT")}</p>
            <DialogHeader>
              <DialogTitle>{t("Config speichern")}</DialogTitle>
              <DialogDescription>{t("Speichere die aktuelle Config in deiner Cloud-Bibliothek.")}</DialogDescription>
            </DialogHeader>
            <Label className="dialog-label">{t("Name")}<Input value={configName} onChange={(event) => setConfigName(event.target.value)} minLength={1} maxLength={60} autoFocus required /></Label>
            {currentId && <Label className="dialog-label">{t("Name des Speicherpunkts (optional)")}<Input value={checkpointLabel} onChange={(event) => setCheckpointLabel(event.target.value)} maxLength={80} placeholder={t("z. B. Vor dem Sensitivity-Experiment")} /></Label>}
            <div className="dialog-summary"><Clipboard size={16} /><span>{t("entriesActive", { count: enabledCount })}</span><span>{lineCount} {t("Zeilen")}</span></div>
            <Button type="submit" className="primary-button dialog-submit" disabled={saveConfigMutation.isPending || createConfigMutation.isPending || Boolean(currentId && syncStatus === "syncing")}>{(saveConfigMutation.isPending || createConfigMutation.isPending || syncStatus === "syncing") && <LoaderCircle className="spin" size={16} />}{currentId ? t("Änderungen speichern") : t("Neue Config speichern")}</Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={libraryOpen} onOpenChange={setLibraryOpen}>
        <DialogContent className="library-dialog">
          <div className="library-head">
            <DialogHeader>
              <p className="eyebrow">{t("DEINE CLOUD")}</p>
              <DialogTitle>{t("Gespeicherte Configs")}</DialogTitle>
              <DialogDescription className="muted">{t("Öffne oder verwalte deine gespeicherten Configs.")}</DialogDescription>
            </DialogHeader>
          </div>
          {configsQuery.isFetching ? <div className="library-loading"><LoaderCircle className="spin" size={22} />{t("Configs werden geladen …")}</div> : savedConfigs.length ? (
            <div className="library-list">{savedConfigs.map((config) => (
              <div key={config.id} className={`library-row ${config.id === currentId ? "current" : ""}`}>
                <Button variant="ghost" className="library-load" onClick={() => void loadConfig(config)}>
                  <FileCode2 size={18} />
                  <span><strong>{config.name}</strong><small>{t("updatedAt", { date: new Intl.DateTimeFormat(i18n.resolvedLanguage === "en" ? "en-US" : "de-DE", { dateStyle: "medium" }).format(new Date(config.updatedAt)) })}</small></span>
                  <small className="library-type">{t("Revision")} {config.revision}</small>
                  {config.id === currentId && <Badge>{t("AKTIV")}</Badge>}
                </Button>
                <Button variant="ghost" className="library-delete" onClick={() => { setLibraryOpen(false); setHistoryConfig(config); }} aria-label={t("Versionsverlauf öffnen")}><History size={16} /></Button>
                <Button variant="ghost" className="library-delete" onClick={() => setDeleteCandidate(config)} aria-label={t("deleteConfigLabel", { name: config.name })}><Trash2 size={16} /></Button>
              </div>
            ))}</div>
          ) : (
            <div className="empty-state compact">
              <Cloud size={26} />
              <h2>{t("Noch keine Config gespeichert")}</h2>
              <p>{t("Dein aktuelles Setup wartet schon.")}</p>
              <Button className="primary-button" onClick={() => { setLibraryOpen(false); setSaveOpen(true); }}><Save size={16} />{t("Erste Config speichern")}</Button>
            </div>
          )}
          {(trashQuery.data?.length ?? 0) > 0 && (
            <section className="trash-section">
              <p className="eyebrow">{t("PAPIERKORB")}</p>
              <div className="library-list">{trashQuery.data?.map((config) => (
                <div key={config.id} className="library-row is-trashed">
                  <div className="library-load">
                    <Trash2 size={18} />
                    <span><strong>{config.name}</strong><small>{t("deletedAt", { date: new Intl.DateTimeFormat(i18n.resolvedLanguage === "en" ? "en-US" : "de-DE", { dateStyle: "medium", timeStyle: "short" }).format(new Date(config.deletedAt!)) })}</small></span>
                  </div>
                  <Button variant="ghost" className="library-delete" onClick={() => void undeleteConfig(config)} aria-label={t("Wiederherstellen")}><Undo2 size={16} /></Button>
                  <Button variant="ghost" className="library-delete" onClick={() => setPermanentDeleteCandidate(config)} aria-label={t("Endgültig löschen")}><Trash2 size={16} /></Button>
                </div>
              ))}</div>
            </section>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(historyConfig)} onOpenChange={(open) => !open && setHistoryConfig(null)}>
        <DialogContent className="library-dialog history-dialog">
          <DialogHeader>
            <p className="eyebrow">{t("VERSIONSVERLAUF")}</p>
            <DialogTitle>{historyConfig?.name}</DialogTitle>
            <DialogDescription className="muted">{t("Jeder bestätigte Stand kann als neue Revision wiederhergestellt werden.")}</DialogDescription>
          </DialogHeader>
          <form className="point-in-time-form" onSubmit={(event) => void restoreAtTime(event)}>
            <Label>{t("Stand zu einem Zeitpunkt")}<Input type="datetime-local" step="1" value={recoveryTime} onChange={(event) => setRecoveryTime(event.target.value)} required /></Label>
            <Button type="submit" variant="outline" disabled={!recoveryTime || restoreMutation.isPending}><Undo2 size={14} />{t("Zeitpunkt wiederherstellen")}</Button>
          </form>
          {historyQuery.isPending ? (
            <div className="library-loading"><LoaderCircle className="spin" size={22} />{t("Versionen werden geladen …")}</div>
          ) : historyQuery.data?.items.length ? (
            <div className="history-list">{historyQuery.data.items.map((revision) => (
              <div className="history-row" key={revision.revision}>
                <div>
                  <strong>{t("Revision")} {revision.revision}</strong>
                  <small>{revision.label ? `${revision.label} · ` : ""}{t(`revisionKind.${revision.kind}`)} · {new Intl.DateTimeFormat(i18n.resolvedLanguage === "en" ? "en-US" : "de-DE", { dateStyle: "medium", timeStyle: "medium" }).format(new Date(revision.createdAt))}</small>
                </div>
                {revision.revision === historyConfig?.revision
                  ? <Badge>{t("AKTUELL")}</Badge>
                  : <Button variant="outline" size="sm" disabled={restoreMutation.isPending} onClick={() => void restoreRevision(revision.revision)}><Undo2 size={14} />{t("Wiederherstellen")}</Button>}
              </div>
            ))}</div>
          ) : <div className="empty-state compact"><History size={26} /><p>{t("Keine Versionen gefunden.")}</p></div>}
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleteCandidate)} onOpenChange={(open) => !open && setDeleteCandidate(null)}>
        <AlertDialogContent className="delete-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("Config löschen?")}</AlertDialogTitle>
            <AlertDialogDescription>{t("deleteConfigDescription", { name: deleteCandidate?.name })}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("Abbrechen")}</AlertDialogCancel>
            <AlertDialogAction variant="destructive" disabled={deleteConfigMutation.isPending} onClick={() => deleteCandidate && deleteConfig(deleteCandidate.id)}>{t("In Papierkorb")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={Boolean(permanentDeleteCandidate)} onOpenChange={(open) => !open && setPermanentDeleteCandidate(null)}>
        <AlertDialogContent className="delete-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("Config endgültig löschen?")}</AlertDialogTitle>
            <AlertDialogDescription>{t("Die Config und ihr vollständiger Versionsverlauf werden unwiderruflich entfernt.")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("Abbrechen")}</AlertDialogCancel>
            <AlertDialogAction variant="destructive" disabled={permanentDeleteMutation.isPending} onClick={() => permanentDeleteCandidate && void permanentlyDeleteConfig(permanentDeleteCandidate)}>{t("Endgültig löschen")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
