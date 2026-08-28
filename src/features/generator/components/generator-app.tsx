"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { inferRouterOutputs } from "@trpc/server";
import { useTranslation } from "react-i18next";
import { Download } from "lucide-react";
import { toast } from "sonner";
import type { Session } from "next-auth";
import { Button } from "@/components/ui/button";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import {
  bindActions,
  commands,
  isCommandEditable,
} from "../catalog/commands";
import { parseConfigFiles, serializeConfig } from "../domain/codec";
import { normalizeDocument } from "@/features/generator/domain/document";
import { findBindingConflicts } from "@/features/generator/domain/bindings";
import type { ConfigType } from "@/features/generator/domain/types";
import { configTypes, configTypeUsesBinds, defaultConfigName, getConfigTypeDefinition, isCommandAvailable } from "@/features/generator/domain/config-types";
import { generatorModules, moduleDocumentItemCount, type GeneratorModuleId } from "@/features/generator/modules/registry";
import { useTRPC } from "@/trpc/client";
import type { AppRouter } from "@/trpc/router";
import { getPendingAutosave, putPendingAutosave, removePendingAutosave } from "../persistence/autosave-store";
import { createAutosaveController } from "../persistence/autosave-controller";
import { hydrateDraftStore, startDraftPersistence } from "../persistence/draft-store";
import {
  GeneratorEditorStoreProvider,
  useGeneratorEditorStore,
  useGeneratorEditorStoreApi,
} from "../state/editor-store";
import { GeneratorSidebar } from "./generator-sidebar";
import { GeneratorTopbar } from "./generator-topbar";
import { GeneratorWorkspace } from "./generator-workspace";
import { ConfigOutputPanel } from "./config-output-panel";
import { GeneratorDialogs } from "./generator-dialogs";
import { CommandRegister } from "./command-register";
import { selectConfigDefinition, selectEnabledCount, selectLineCount, selectRawConfig } from "../state/selectors";

type UserShape = Session["user"] | null;
export type AuthProviders = { discord: boolean; steam: boolean };
type SavedConfig = inferRouterOutputs<AppRouter>["config"]["list"][number];
type TrashedConfig = inferRouterOutputs<AppRouter>["config"]["trash"][number];

export function GeneratorApp(props: { user: UserShape; authProviders: AuthProviders }) {
  const { t } = useTranslation();
  return (
    <GeneratorEditorStoreProvider initialName={t(defaultConfigName("matchmaking"))}>
      <GeneratorAppContent {...props} />
    </GeneratorEditorStoreProvider>
  );
}

function GeneratorAppContent({ user, authProviders }: { user: UserShape; authProviders: AuthProviders }) {
  const { t, i18n } = useTranslation();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const editorStore = useGeneratorEditorStoreApi();
  const editorLocale = i18n.resolvedLanguage === "en" ? "en" : "de";
  const generatorDocument = useGeneratorEditorStore((state) => state.document);
  const configName = useGeneratorEditorStore((state) => state.name);
  const origin = useGeneratorEditorStore((state) => state.origin);
  const sync = useGeneratorEditorStore((state) => state.sync);
  const hydration = useGeneratorEditorStore((state) => state.hydration);
  const query = useGeneratorEditorStore((state) => state.query);
  const activeCategory = useGeneratorEditorStore((state) => state.activeCategory);
  const configPanelOpen = useGeneratorEditorStore((state) => state.configPanelOpen);
  const replaceDocument = useGeneratorEditorStore((state) => state.replaceDocument);
  const updateCommand = useGeneratorEditorStore((state) => state.updateCommand);
  const setConfigName = useGeneratorEditorStore((state) => state.setName);
  const setQuery = useGeneratorEditorStore((state) => state.setQuery);
  const setActiveCategory = useGeneratorEditorStore((state) => state.setActiveCategory);
  const setConfigPanelOpen = useGeneratorEditorStore((state) => state.setConfigPanelOpen);
  const setSliderActive = useGeneratorEditorStore((state) => state.setSliderActive);
  const rawConfig = useGeneratorEditorStore((state) => selectRawConfig(state, editorLocale));
  const configDefinition = useGeneratorEditorStore(selectConfigDefinition);
  const enabledCount = useGeneratorEditorStore(selectEnabledCount);
  const lineCount = useGeneratorEditorStore((state) => selectLineCount(state, editorLocale));
  const currentId = origin.type === "cloud" ? origin.configId : null;
  const currentRevision = origin.type === "cloud" ? origin.revision : 0;
  const syncStatus = sync.status;
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
  const [authOpen, setAuthOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [commandRegisterOpen, setCommandRegisterOpen] = useState(false);
  const [historyConfig, setHistoryConfig] = useState<SavedConfig | null>(null);
  const [recoveryTime, setRecoveryTime] = useState("");
  const [deleteCandidate, setDeleteCandidate] = useState<SavedConfig | null>(null);
  const [permanentDeleteCandidate, setPermanentDeleteCandidate] = useState<TrashedConfig | null>(null);
  const [checkpointLabel, setCheckpointLabel] = useState("");
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
  const savedConfigs = configsQuery.data ?? [];
  const configsLoading = Boolean(user) && configsQuery.isPending;

  const localizedCommands = useMemo(() => commands.map((command) => ({
    ...command,
    label: t(command.label),
    description: t(command.description),
    options: command.options?.map((option) => ({ ...option, label: t(option.label) })),
  })), [t]);
  const editorCommands = useMemo(() => localizedCommands.filter(isCommandEditable), [localizedCommands]);
  const localizedModules = useMemo(() => generatorModules.map((module) => ({
    ...module,
    label: t(module.label),
    shortLabel: t(module.shortLabel),
    description: t(module.description),
    searchableText: `${module.searchableText} ${t(module.label)} ${t(module.shortLabel)} ${t(module.description)} ${bindActions.map((action) => `${t(action.label)} ${t(action.group)}`).join(" ")}`.toLowerCase(),
  })), [t]);
  const localizedConfigTypes = useMemo(() => configTypes.map((type) => ({
    ...type, label: t(type.label), description: t(type.description),
  })), [t]);
  const availableModules = useMemo(() => localizedModules.filter((module) => module.kind === "settings"
    ? editorCommands.some((command) => command.category === module.id && isCommandAvailable(generatorDocument.configType, command))
    : configTypeUsesBinds(generatorDocument.configType)), [editorCommands, generatorDocument.configType, localizedModules]);
  const documentFingerprint = useMemo(
    () => JSON.stringify({ name: configName, values: generatorDocument }),
    [configName, generatorDocument],
  );
  const activeModules = useMemo(
    () => availableModules.filter((module) => module.kind === "settings"
      ? editorCommands.some((command) => command.category === module.id && isCommandAvailable(generatorDocument.configType, command) && generatorDocument.commandValues[`enabled:${command.name}`])
      : moduleDocumentItemCount(module, generatorDocument, true) > 0),
    [availableModules, editorCommands, generatorDocument],
  );
  const settingsModules = availableModules.filter((module) => module.kind === "settings");
  const bindModules = availableModules.filter((module) => module.kind !== "settings");

  const updateCachedConfig = useCallback((saved: inferRouterOutputs<AppRouter>["config"]["get"]) => {
    const metadata: SavedConfig = {
      id: saved.id,
      name: saved.name,
      revision: saved.revision,
      createdAt: saved.createdAt,
      updatedAt: saved.updatedAt,
      deletedAt: saved.deletedAt,
    };
    queryClient.setQueryData(trpc.config.list.queryKey(), (items: SavedConfig[] | undefined) => [
      metadata,
      ...(items ?? []).filter((item) => item.id !== saved.id),
    ]);
  }, [queryClient, trpc.config.list]);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("authError") === "steam") {
      toast.error(t("Steam-Anmeldung fehlgeschlagen."));
      url.searchParams.delete("authError");
      window.history.replaceState(null, "", url);
    }
  }, [t]);

  useEffect(() => {
    hydrateDraftStore(editorStore, window.localStorage, Boolean(user));
    return startDraftPersistence(editorStore, window.localStorage);
  }, [editorStore, user]);

  useEffect(() => {
    if (!configsQuery.data || hydration !== "ready" || !currentId || origin.type !== "cloud") return;
    const current = configsQuery.data.find((config) => config.id === currentId);
    if (!current) {
      editorStore.getState().detachCloud();
      return;
    }
    if (current.revision > origin.revision && documentFingerprint === origin.lastSyncedFingerprint) {
      void queryClient.fetchQuery(trpc.config.get.queryOptions({ id: current.id })).then((loaded) => {
        editorStore.getState().loadCloudConfig(loaded);
      }).catch(() => editorStore.getState().autosaveFailed("cloud-reconcile"));
      return;
    }
    if (current.revision > origin.revision && documentFingerprint !== origin.lastSyncedFingerprint) {
      editorStore.getState().autosaveFailed("cloud-reconcile", "CONFLICT", current.revision);
      return;
    }
    editorStore.getState().validateCloudOrigin(current.revision);
  }, [configsQuery.data, currentId, documentFingerprint, editorStore, hydration, origin, queryClient, trpc.config.get]);

  useEffect(() => {
    if (configsQuery.error) toast.error(t(configsQuery.error.message));
  }, [configsQuery.error, t]);

  useEffect(() => {
    if (!user || hydration !== "ready") return;
    const controller = createAutosaveController({
      store: editorStore,
      api: { autosave: autosaveConfig },
      repository: { put: putPendingAutosave, get: getPendingAutosave, remove: removePendingAutosave },
      serialize: (state) => serializeConfig(state.document, i18n.resolvedLanguage === "en" ? "en" : "de"),
      onSaved: updateCachedConfig,
      onConflict: () => toast.error(t("Autosave-Konflikt erkannt. Dein lokaler Stand wurde nicht überschrieben.")),
    });
    return () => controller.stop();
  }, [autosaveConfig, editorStore, hydration, i18n.resolvedLanguage, t, updateCachedConfig, user]);

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
    updateCommand(name, value);
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
    const importedName = files.length === 1
      ? files[0].name.replace(/\.(cfg|vcfg|kv3|txt)$/i, "") || t("Importierte Config")
      : undefined;
    editorStore.getState().importDocument(parseConfigFiles(imports, generatorDocument), importedName);
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
          expectedRevision: currentRevision,
          mutationId,
          checkpointLabel: checkpointLabel.trim() || undefined,
          name: configName,
          values: generatorDocument,
          rawConfig,
        })
        : await createConfigMutation.mutateAsync({ name: configName, values: generatorDocument, rawConfig, mutationId });
      editorStore.getState().manualSaveSucceeded(saved);
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
    editorStore.getState().beginCloudLoad();
    try {
      const loaded = await queryClient.fetchQuery(trpc.config.get.queryOptions({ id: config.id }));
      editorStore.getState().loadCloudConfig(loaded);
      await removePendingAutosave(loaded.id).catch(() => undefined);
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
        editorStore.getState().detachCloud(t(defaultConfigName(generatorDocument.configType)));
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
        ? currentRevision
        : (savedConfigs.find((config) => config.id === historyConfig.id)?.revision ?? historyConfig.revision);
      const saved = await restoreMutation.mutateAsync({
        id: historyConfig.id,
        revision,
        expectedRevision,
        mutationId: crypto.randomUUID(),
        rawConfig: serializeConfig(document, i18n.resolvedLanguage === "en" ? "en" : "de"),
      });
      editorStore.getState().manualSaveSucceeded(saved);
      updateCachedConfig(saved);
      await removePendingAutosave(saved.id).catch(() => undefined);
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
  }

  function resetDocument() {
    editorStore.getState().createAnonymousDocument(
      generatorDocument.configType,
      t(defaultConfigName(generatorDocument.configType)),
    );
    toast.success(t("Standardwerte wiederhergestellt."));
  }

  function selectConfigType(configType: ConfigType) {
    if (configType === generatorDocument.configType) return;
    editorStore.getState().createAnonymousDocument(configType, t(defaultConfigName(configType)));
    toast.success(t("configTypeSelected", { type: t(getConfigTypeDefinition(configType).label) }));
  }

  return (
    <SidebarProvider
      className={`app-shell ${configPanelOpen ? "" : "config-panel-is-collapsed"}`}
      onPointerDownCapture={(event) => {
        if ((event.target as HTMLElement).closest('[data-slot="slider"]')) setSliderActive(true);
      }}
      onPointerUpCapture={() => setSliderActive(false)}
      onPointerCancelCapture={() => setSliderActive(false)}
    >
      <GeneratorSidebar
        user={user}
        document={generatorDocument}
        activeCategory={activeCategory}
        activeModuleCount={activeModules.length}
        settingsModules={settingsModules}
        bindModules={bindModules}
        commands={editorCommands}
        onSelectCategory={selectCategory}
        onOpenLibrary={() => void openLibrary()}
        onRequestSave={requestSave}
        onOpenAccount={() => setAccountOpen(true)}
        onOpenAuth={() => setAuthOpen(true)}
        onOpenCommandRegister={() => setCommandRegisterOpen(true)}
      />

      <SidebarInset className="generator-inset">
        <GeneratorTopbar
          signedIn={Boolean(user)}
          currentId={currentId}
          currentName={configName}
          configs={savedConfigs}
          loading={configsLoading}
          outputPanelOpen={configPanelOpen}
          onSelectConfig={selectConfig}
          onOpenOutputPanel={() => setConfigPanelOpen(true)}
        />
        <GeneratorWorkspace
          document={generatorDocument}
          query={query}
          activeCategory={activeCategory}
          commands={editorCommands}
          modules={availableModules}
          configTypes={localizedConfigTypes}
          importRef={importRef}
          searchRef={searchRef}
          onQueryChange={setQuery}
          onCategoryChange={setActiveCategory}
          onConfigTypeChange={selectConfigType}
          onCommandChange={update}
          onDocumentChange={replaceDocument}
          onImport={importConfig}
          onReset={resetDocument}
        />
      </SidebarInset>

      <ConfigOutputPanel
        open={configPanelOpen}
        source={rawConfig}
        definition={configDefinition}
        lineCount={lineCount}
        conflictCount={conflictingKeys.size}
        copied={copied}
        onClose={() => setConfigPanelOpen(false)}
        onCopy={() => void copyConfig()}
        onDownload={downloadConfig}
      />

      <CommandRegister open={commandRegisterOpen} onOpenChange={setCommandRegisterOpen} />


      <div className="mobile-download-bar"><span>{t("entryCount", { count: enabledCount })}</span><Button className="primary-button" onClick={downloadConfig}><Download size={16} />{configDefinition.fileName}</Button></div>

      <GeneratorDialogs
        user={user}
        authProviders={authProviders}
        authOpen={authOpen}
        accountOpen={accountOpen}
        saveOpen={saveOpen}
        libraryOpen={libraryOpen}
        currentId={currentId}
        configName={configName}
        enabledCount={enabledCount}
        lineCount={lineCount}
        syncStatus={syncStatus}
        configs={savedConfigs}
        configsFetching={configsQuery.isFetching}
        trash={trashQuery.data ?? []}
        historyConfig={historyConfig}
        historyItems={historyQuery.data?.items ?? []}
        historyPending={historyQuery.isPending}
        deleteCandidate={deleteCandidate}
        permanentDeleteCandidate={permanentDeleteCandidate}
        savePending={saveConfigMutation.isPending || createConfigMutation.isPending}
        restorePending={restoreMutation.isPending}
        deletePending={deleteConfigMutation.isPending}
        permanentDeletePending={permanentDeleteMutation.isPending}
        checkpointLabel={checkpointLabel}
        recoveryTime={recoveryTime}
        onAuthOpenChange={setAuthOpen}
        onAccountOpenChange={setAccountOpen}
        onSaveOpenChange={setSaveOpen}
        onLibraryOpenChange={setLibraryOpen}
        onNameChange={setConfigName}
        onCheckpointLabelChange={setCheckpointLabel}
        onRecoveryTimeChange={setRecoveryTime}
        onSave={persistConfig}
        onLoad={(config) => void loadConfig(config as SavedConfig)}
        onOpenHistory={(config) => { setLibraryOpen(false); setHistoryConfig(config as SavedConfig); }}
        onCloseHistory={() => setHistoryConfig(null)}
        onRestoreRevision={(revision) => void restoreRevision(revision)}
        onRestoreAtTime={(event) => void restoreAtTime(event)}
        onSelectDelete={(config) => setDeleteCandidate(config as SavedConfig | null)}
        onDelete={(config) => void deleteConfig(config.id)}
        onUndelete={(config) => void undeleteConfig(config as TrashedConfig)}
        onSelectPermanentDelete={(config) => setPermanentDeleteCandidate(config as TrashedConfig | null)}
        onPermanentDelete={(config) => void permanentlyDeleteConfig(config as TrashedConfig)}
      />

    </SidebarProvider>
  );
}
