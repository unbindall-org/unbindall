"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { inferRouterOutputs } from "@trpc/server";
import { CircleAlert, LoaderCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import type { Session } from "next-auth";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { bindActions, isCommandEditable, presets } from "@/features/generator/catalog/commands";
import type { CommandCatalogSnapshot } from "@/features/generator/catalog/model";
import { localizeCatalog } from "@/features/generator/catalog/snapshot";
import { parseConfigFiles, serializeConfig } from "@/features/generator/domain/codec";
import { createDefaultDocument, normalizeDocument } from "@/features/generator/domain/document";
import { findBindingConflicts } from "@/features/generator/domain/bindings";
import type { ConfigType, GeneratorDocument } from "@/features/generator/domain/types";
import {
  configTypeUsesBinds,
  defaultConfigName,
  isCommandAvailable,
} from "@/features/generator/domain/config-types";
import { createGeneratorModules } from "@/features/generator/modules/registry";
import { useTRPC } from "@/trpc/client";
import type { AppRouter } from "@/trpc/router";
import {
  getPendingAutosave,
  putPendingAutosave,
  removePendingAutosave,
} from "@/features/generator/persistence/autosave-store";
import { createAutosaveController } from "@/features/generator/persistence/autosave-controller";
import { hydrateDraftStore, readDraft, startDraftPersistence } from "@/features/generator/persistence/draft-store";
import {
  editorFingerprint,
  GeneratorEditorStoreProvider,
  useGeneratorEditorStore,
  useGeneratorEditorStoreApi,
} from "@/features/generator/state/editor-store";
import {
  selectConfigDefinition,
  selectEnabledCount,
  selectLineCount,
  selectRawConfig,
} from "@/features/generator/state/selectors";
import { GeneratorWorkspace } from "@/features/generator/components/generator-workspace";
import { ConfigOutputDialog } from "@/features/generator/components/config-output-dialog";
import { CommandRegisterPage } from "@/features/generator/components/command-register-page";
import { GeneratorDialogs } from "@/features/generator/components/generator-dialogs";
import { CommunityFeed } from "@/features/community/components/community-feed";
import { CommunityNewPost } from "@/features/community/components/community-new-post";
import { hasRole } from "@/features/auth/domain/roles";
import { AdminPage } from "@/features/platform/components/admin-page";
import { ModerationPage } from "@/features/platform/components/moderation-page";
import {
  buildTree,
  defaultProjectName,
  tabId,
  tabUsesExplorer,
  toTab,
  type WorkspaceFile,
  type WorkspaceProject,
  type WorkspaceTabDescriptor,
} from "@/features/workspace/domain/workspace";
import { pathForTab, tabForPath } from "@/features/workspace/domain/routes";
import {
  hydrateWorkspaceStore,
  startWorkspacePersistence,
} from "@/features/workspace/persistence/workspace-storage";
import {
  useWorkspaceStore,
  useWorkspaceStoreApi,
  WorkspaceStoreProvider,
} from "@/features/workspace/state/workspace-store";
import { ActivityBar } from "./activity-bar";
import { AppSidebar } from "./app-sidebar";
import { NewConfigPage, type NewConfigRequest } from "./new-config-page";
import { ProjectNameDialog } from "./project-name-dialog";
import { SettingsPage } from "./settings-page";
import { StartPage } from "./start-page";
import { TrashPage } from "./trash-page";
import { describeTabs, TabBar } from "./tab-bar";

type UserShape = Session["user"] | null;
export type AuthProviders = { discord: boolean; steam: boolean };
type SavedConfig = inferRouterOutputs<AppRouter>["config"]["list"][number];
type SavedProject = inferRouterOutputs<AppRouter>["project"]["list"][number];
type LoadedConfig = inferRouterOutputs<AppRouter>["config"]["get"];
type TrashedConfig = inferRouterOutputs<AppRouter>["config"]["trash"][number];

const LOCAL_PROJECT_PREFIX = "local:";
/** Stands in for "the account's default project" before one exists on the server. */
const CLOUD_DEFAULT_PROJECT_ID = "default";

function workspaceLocation(path: string) {
  return `${path}${window.location.search}${window.location.hash}`;
}

export type ShellProps = {
  user: UserShape;
  authProviders: AuthProviders;
  initialCatalog: CommandCatalogSnapshot;
  initialConfigs: SavedConfig[];
  initialProjects: SavedProject[];
  initialConfig: LoadedConfig | null;
  initialTab?: WorkspaceTabDescriptor;
};

export function AppShell(props: ShellProps) {
  const { t, i18n } = useTranslation();
  const editorLocale = i18n.resolvedLanguage === "en" ? "en" : "de";
  const initialCommands = useMemo(() => localizeCatalog(props.initialCatalog, editorLocale), [editorLocale, props.initialCatalog]);
  return (
    <WorkspaceStoreProvider initialTab={props.initialTab}>
      <GeneratorEditorStoreProvider
        initialName={t(defaultConfigName("matchmaking"))}
        catalog={initialCommands}
        initialConfig={props.initialConfig}
      >
        <AppShellContent {...props} />
      </GeneratorEditorStoreProvider>
    </WorkspaceStoreProvider>
  );
}

function AppShellContent({
  user,
  authProviders,
  initialCatalog,
  initialConfigs,
  initialProjects,
  initialConfig,
  initialTab,
}: ShellProps) {
  const { t, i18n } = useTranslation();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const editorStore = useGeneratorEditorStoreApi();
  const workspaceStore = useWorkspaceStoreApi();
  const editorLocale = i18n.resolvedLanguage === "en" ? "en" : "de";
  const signedIn = Boolean(user);
  const canModerate = Boolean(user && hasRole(user.role, "moderator"));
  const canAdminister = Boolean(user && hasRole(user.role, "platform_admin"));

  const generatorDocument = useGeneratorEditorStore((state) => state.document);
  const configName = useGeneratorEditorStore((state) => state.name);
  const origin = useGeneratorEditorStore((state) => state.origin);
  const sync = useGeneratorEditorStore((state) => state.sync);
  const hydration = useGeneratorEditorStore((state) => state.hydration);
  const query = useGeneratorEditorStore((state) => state.query);
  const showAllCommands = useGeneratorEditorStore((state) => state.showAllCommands);
  const replaceDocument = useGeneratorEditorStore((state) => state.replaceDocument);
  const updateCommand = useGeneratorEditorStore((state) => state.updateCommand);
  const setConfigName = useGeneratorEditorStore((state) => state.setName);
  const setQuery = useGeneratorEditorStore((state) => state.setQuery);
  const setShowAllCommands = useGeneratorEditorStore((state) => state.setShowAllCommands);
  const setSliderActive = useGeneratorEditorStore((state) => state.setSliderActive);
  const rawConfig = useGeneratorEditorStore((state) => selectRawConfig(state, editorLocale));
  const configDefinition = useGeneratorEditorStore(selectConfigDefinition);
  const enabledCount = useGeneratorEditorStore(selectEnabledCount);
  const lineCount = useGeneratorEditorStore((state) => selectLineCount(state, editorLocale));

  const workspaceHydrated = useWorkspaceStore((state) => state.hydrated);
  const localProjects = useWorkspaceStore((state) => state.projects);
  const localConfigs = useWorkspaceStore((state) => state.configs);
  const tabs = useWorkspaceStore((state) => state.tabs);
  const activeTabId = useWorkspaceStore((state) => state.activeTabId);

  const currentId = origin.type === "cloud" ? origin.configId : null;
  const currentRevision = origin.type === "cloud" ? origin.revision : 0;
  const syncStatus = sync.status;

  const configsQuery = useQuery(trpc.config.list.queryOptions(undefined, {
    enabled: signedIn,
    retry: false,
    initialData: initialConfigs,
  }));
  const catalogQuery = useQuery(trpc.catalog.public.queryOptions(undefined, {
    initialData: initialCatalog,
    staleTime: 60_000,
  }));
  const projectsQuery = useQuery(trpc.project.list.queryOptions(undefined, {
    enabled: signedIn,
    retry: false,
    initialData: initialProjects,
  }));
  const createConfigMutation = useMutation(trpc.config.create.mutationOptions());
  const saveConfigMutation = useMutation(trpc.config.save.mutationOptions());
  const { mutateAsync: autosaveConfig } = useMutation(trpc.config.autosave.mutationOptions());
  const deleteConfigMutation = useMutation(trpc.config.delete.mutationOptions());
  const restoreMutation = useMutation(trpc.config.restore.mutationOptions());
  const undeleteMutation = useMutation(trpc.config.undelete.mutationOptions());
  const permanentDeleteMutation = useMutation(trpc.config.permanentDelete.mutationOptions());
  const createProjectMutation = useMutation(trpc.project.create.mutationOptions());
  const renameProjectMutation = useMutation(trpc.project.rename.mutationOptions());
  const deleteProjectMutation = useMutation(trpc.project.delete.mutationOptions());

  const [authOpen, setAuthOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [outputOpen, setOutputOpen] = useState(false);
  const [transferPending, setTransferPending] = useState(false);
  const [newConfigProjectId, setNewConfigProjectId] = useState<string | null>(null);
  const [projectDialog, setProjectDialog] = useState<{ mode: "create" | "rename"; id?: string; name: string } | null>(null);
  const [historyConfig, setHistoryConfig] = useState<SavedConfig | null>(null);
  const [recoveryTime, setRecoveryTime] = useState("");
  const [deleteCandidate, setDeleteCandidate] = useState<SavedConfig | null>(null);
  const [permanentDeleteCandidate, setPermanentDeleteCandidate] = useState<TrashedConfig | null>(null);
  const [checkpointLabel, setCheckpointLabel] = useState("");
  const [copied, setCopied] = useState(false);

  const trashTabOpen = tabs.some((tab) => tab.kind === "trash");
  const trashQuery = useQuery(trpc.config.trash.queryOptions(undefined, {
    enabled: signedIn && trashTabOpen,
    retry: false,
  }));
  const historyQuery = useQuery(trpc.config.history.queryOptions({
    id: historyConfig?.id ?? "00000000-0000-0000-0000-000000000000",
    limit: 100,
  }, { enabled: Boolean(historyConfig), retry: false }));

  const importRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const bootConfigRef = useRef(initialConfig);
  /** Which local (browser-only) config the editor currently mirrors. */
  const openLocalIdRef = useRef<string | null>(null);
  const savedConfigs = useMemo(() => configsQuery.data ?? [], [configsQuery.data]);
  const cloudProjects = useMemo(() => projectsQuery.data ?? [], [projectsQuery.data]);

  /**
   * Before the stored workspace arrives, the entry route already says which
   * area this is — so a deep link server-renders its own content instead of
   * flashing the workspace root.
   */
  const activeTab = useMemo(() => {
    const stored = tabs.find((tab) => tab.id === activeTabId);
    const candidate = stored ?? (workspaceHydrated || !initialTab ? null : toTab(initialTab));
    if (candidate?.kind === "admin" && !canAdminister) return null;
    if (candidate?.kind === "moderation" && !canModerate) return null;
    return candidate;
  }, [activeTabId, canAdminister, canModerate, initialTab, tabs, workspaceHydrated]);
  const activeConfigId = activeTab?.kind === "config" ? activeTab.configId : null;
  const explorerVisible = tabUsesExplorer(activeTab);
  const activeLocalConfig = activeConfigId
    ? localConfigs.find((config) => config.id === activeConfigId)
    : null;
  const activeConfigReady = !activeConfigId || (activeLocalConfig
    ? origin.type === "local" && origin.configId === activeConfigId
    : origin.type === "cloud" && origin.configId === activeConfigId);

  /**
   * Workspace content already lives in client state, so history updates do not
   * need to wait for a server navigation. Next.js integrates the native History
   * API with its router; updating the address first and the store second keeps
   * both the URL and the visible tab synchronous with the click.
   */
  const navigateToTab = useCallback((descriptor: WorkspaceTabDescriptor) => {
    const path = pathForTab(descriptor);
    if (window.location.pathname !== path) {
      window.history.pushState(null, "", workspaceLocation(path));
    }
    workspaceStore.getState().openTab(descriptor);
  }, [workspaceStore]);

  /* ---------------------------------------------------------------- files */

  const files = useMemo<WorkspaceFile[]>(() => {
    const cloud: WorkspaceFile[] = signedIn ? savedConfigs.map((config) => ({
      id: config.id,
      projectId: config.projectId ?? cloudProjects[0]?.id ?? CLOUD_DEFAULT_PROJECT_ID,
      name: config.name,
      configType: config.configType as ConfigType,
      origin: "cloud",
      updatedAt: config.updatedAt,
    })) : [];
    const local: WorkspaceFile[] = localConfigs.map((config) => ({
      id: config.id,
      projectId: `${LOCAL_PROJECT_PREFIX}${config.projectId}`,
      name: config.name,
      configType: config.configType,
      origin: "local",
      updatedAt: config.updatedAt,
    }));
    return [...cloud, ...local];
  }, [cloudProjects, localConfigs, savedConfigs, signedIn]);

  const fileMap = useMemo(() => new Map(files.map((file) => [file.id, file])), [files]);

  /**
   * One workspace, one home. Signed out it lives in the browser; signed in it
   * lives in the account. Local leftovers are never mixed into the project tree
   * — they wait in their own shelf until they are transferred.
   */
  const projects = useMemo<WorkspaceProject[]>(() => {
    if (!signedIn) {
      return localProjects.map((project) => ({ ...project, id: `${LOCAL_PROJECT_PREFIX}${project.id}` }));
    }
    const cloud = cloudProjects.map((project, index) => ({
      id: project.id,
      name: project.name,
      position: project.position ?? index,
    }));
    return cloud.length ? cloud : [{ id: CLOUD_DEFAULT_PROJECT_ID, name: defaultProjectName, position: 0 }];
  }, [cloudProjects, localProjects, signedIn]);

  const localShelf = useMemo(
    () => signedIn ? files.filter((file) => file.origin === "local") : [],
    [files, signedIn],
  );
  const tree = useMemo(
    () => buildTree(projects, signedIn ? files.filter((file) => file.origin === "cloud") : files),
    [files, projects, signedIn],
  );
  const recentFiles = useMemo(
    () => [...files].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 6),
    [files],
  );
  const dirtyConfigId = ["dirty", "offline", "conflict"].includes(syncStatus) ? currentId : null;

  /* ------------------------------------------------------------ hydration */

  useEffect(() => {
    hydrateWorkspaceStore(workspaceStore, window.localStorage);
    if (initialTab) workspaceStore.getState().openTab(initialTab);
    return startWorkspacePersistence(workspaceStore, window.localStorage);
  }, [initialTab, workspaceStore]);

  // A role may be revoked while restricted tabs still exist in local storage.
  // Remove those tabs immediately instead of trusting persisted client state.
  useEffect(() => {
    if (!workspaceHydrated) return;
    for (const tab of tabs) {
      if ((tab.kind === "admin" && !canAdminister) || (tab.kind === "moderation" && !canModerate)) {
        workspaceStore.getState().closeTab(tab.id);
      }
    }
  }, [canAdminister, canModerate, tabs, workspaceHydrated, workspaceStore]);

  // Back/forward changes the URL first. Re-focus (or re-open) its workspace tab
  // immediately, without waiting for a server round-trip.
  useEffect(() => {
    if (!workspaceHydrated) return;
    function syncTabFromLocation() {
      const descriptor = tabForPath(window.location.pathname);
      if (!descriptor) return;
      if (
        (descriptor.kind === "admin" && !canAdminister) ||
        (descriptor.kind === "moderation" && !canModerate)
      ) {
        const current = workspaceStore.getState();
        const fallback = current.tabs.find((tab) => tab.id === current.activeTabId) ?? null;
        window.history.replaceState(null, "", workspaceLocation(pathForTab(fallback)));
        return;
      }
      if (workspaceStore.getState().activeTabId !== tabId(descriptor)) {
        workspaceStore.getState().openTab(descriptor);
      }
    }

    syncTabFromLocation();
    window.addEventListener("popstate", syncTabFromLocation);
    return () => window.removeEventListener("popstate", syncTabFromLocation);
  }, [canAdminister, canModerate, workspaceHydrated, workspaceStore]);

  // Closing, pruning, or completing a temporary tab changes workspace state
  // without being a new navigation. Keep that correction in the current entry.
  useEffect(() => {
    if (!workspaceHydrated) return;
    const path = pathForTab(activeTab);
    if (window.location.pathname === path) return;
    window.history.replaceState(null, "", workspaceLocation(path));
  }, [activeTab, workspaceHydrated]);

  useEffect(() => {
    const bootConfig = bootConfigRef.current;
    if (!bootConfig) {
      hydrateDraftStore(editorStore, window.localStorage, signedIn);
    } else {
      // The server result is the first paint. Only an actually modified draft
      // for this exact cloud config may replace it after hydration.
      const draft = readDraft(window.localStorage, true);
      if (draft.cloud?.configId === bootConfig.id && draft.document) {
        const draftName = draft.name ?? bootConfig.name;
        const document = normalizeDocument(draft.document, editorStore.getState().catalog);
        if (editorFingerprint(draftName, document) !== draft.cloud.lastSyncedFingerprint) {
          editorStore.getState().hydrateDraft({ ...draft, name: draftName, document });
          editorStore.getState().replaceDocument(document);
        }
      }
    }
    return startDraftPersistence(editorStore, window.localStorage);
  }, [editorStore, signedIn]);

  /** Mirrors editor changes back into the browser-only config the tab points at. */
  useEffect(() => {
    return editorStore.subscribe((state, previous) => {
      const localId = openLocalIdRef.current;
      if (!localId || state.hydration !== "ready") return;
      if (state.document === previous.document && state.name === previous.name) return;
      if (state.origin.type === "cloud") return;
      workspaceStore.getState().updateLocalConfig(localId, { name: state.name, document: state.document });
    });
  }, [editorStore, workspaceStore]);

  /* ------------------------------------------------------------ tab loading */

  const loadCloudConfig = useCallback(async (id: string) => {
    editorStore.getState().beginCloudLoad();
    try {
      const loaded = await queryClient.fetchQuery(trpc.config.get.queryOptions({ id }));
      if (workspaceStore.getState().activeTabId !== tabId({ kind: "config", configId: id })) return;
      editorStore.getState().loadCloudConfig(loaded);
      await removePendingAutosave(loaded.id).catch(() => undefined);
    } catch (error) {
      if (workspaceStore.getState().activeTabId !== tabId({ kind: "config", configId: id })) return;
      const message = error instanceof Error ? t(error.message) : t("Config konnte nicht geladen werden.");
      editorStore.getState().cloudLoadFailed(id, message);
      toast.error(message);
    }
  }, [editorStore, queryClient, t, trpc.config.get, workspaceStore]);

  useEffect(() => {
    if (!workspaceHydrated || hydration !== "ready" || !activeConfigId) return;
    const local = workspaceStore.getState().configs.find((config) => config.id === activeConfigId);
    if (local) {
      if (openLocalIdRef.current === local.id) return;
      openLocalIdRef.current = local.id;
      editorStore.getState().importDocument(local.document, local.name, { type: "local", configId: local.id });
      return;
    }
    openLocalIdRef.current = null;
    if (origin.type === "cloud" && origin.configId === activeConfigId) return;
    if (!signedIn) return;
    if (initialConfig?.id === activeConfigId) {
      editorStore.getState().loadCloudConfig(initialConfig);
      return;
    }
    const loadTimer = window.setTimeout(() => void loadCloudConfig(activeConfigId), 0);
    return () => window.clearTimeout(loadTimer);
  }, [activeConfigId, editorStore, hydration, initialConfig, loadCloudConfig, origin, signedIn, workspaceHydrated, workspaceStore]);

  /** Tabs pointing at configs that no longer exist are dropped once data arrives. */
  useEffect(() => {
    if (!workspaceHydrated) return;
    if (signedIn && configsQuery.isPending) return;
    workspaceStore.getState().pruneConfigTabs(new Set(files.map((file) => file.id)));
  }, [configsQuery.isPending, files, signedIn, workspaceHydrated, workspaceStore]);

  /* ------------------------------------------------------------ cloud sync */

  const updateCachedConfig = useCallback((saved: inferRouterOutputs<AppRouter>["config"]["get"]) => {
    const metadata: SavedConfig = {
      id: saved.id,
      name: saved.name,
      projectId: saved.projectId,
      configType: saved.configType,
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

  const documentFingerprint = useMemo(
    () => JSON.stringify({ name: configName, values: generatorDocument }),
    [configName, generatorDocument],
  );

  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("authError") === "steam") {
      toast.error(t("Steam-Anmeldung fehlgeschlagen."));
      url.searchParams.delete("authError");
      window.history.replaceState(null, "", url);
    }
  }, [t]);

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
    if (!signedIn || hydration !== "ready") return;
    const controller = createAutosaveController({
      store: editorStore,
      api: { autosave: autosaveConfig },
      repository: { put: putPendingAutosave, get: getPendingAutosave, remove: removePendingAutosave },
      serialize: (state) => serializeConfig(
        state.document,
        i18n.resolvedLanguage === "en" ? "en" : "de",
        state.catalog,
      ),
      onSaved: updateCachedConfig,
      onConflict: () => toast.error(t("Autosave-Konflikt erkannt. Dein lokaler Stand wurde nicht überschrieben.")),
    });
    return () => controller.stop();
  }, [autosaveConfig, editorStore, hydration, i18n.resolvedLanguage, signedIn, t, updateCachedConfig]);

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

  /* --------------------------------------------------------------- catalog */

  const localizedCommands = useMemo(
    () => localizeCatalog(catalogQuery.data, editorLocale),
    [catalogQuery.data, editorLocale],
  );
  const editorCommands = useMemo(() => localizedCommands.filter(isCommandEditable), [localizedCommands]);
  const localizedModules = useMemo(() => createGeneratorModules(localizedCommands).map((module) => ({
    ...module,
    label: t(module.label),
    shortLabel: t(module.shortLabel),
    description: t(module.description),
    searchableText: `${module.searchableText} ${t(module.label)} ${t(module.shortLabel)} ${t(module.description)} ${bindActions.map((action) => `${t(action.label)} ${t(action.group)}`).join(" ")}`.toLowerCase(),
  })), [localizedCommands, t]);
  const availableModules = useMemo(() => localizedModules.filter((module) => module.kind === "settings"
    ? editorCommands.some((command) => command.category === module.id && isCommandAvailable(generatorDocument.configType, command))
    : configTypeUsesBinds(generatorDocument.configType)), [editorCommands, generatorDocument.configType, localizedModules]);
  const conflictingKeys = useMemo(() => findBindingConflicts(generatorDocument), [generatorDocument]);

  useEffect(() => {
    editorStore.getState().replaceCatalog(localizedCommands);
  }, [editorStore, localizedCommands]);

  /* --------------------------------------------------------------- actions */

  function openFile(file: WorkspaceFile) {
    navigateToTab({ kind: "config", configId: file.id });
  }

  function selectTab(id: string) {
    const tab = workspaceStore.getState().tabs.find((candidate) => candidate.id === id);
    if (tab) navigateToTab(tab);
  }

  function closeTab(id: string) {
    workspaceStore.getState().closeTab(id);
  }

  function openNewConfig(projectId?: string) {
    setNewConfigProjectId(projectId ?? null);
    navigateToTab({ kind: "new-config" });
  }

  function resolveLocalProjectId(projectId: string | null) {
    const state = workspaceStore.getState();
    if (projectId?.startsWith(LOCAL_PROJECT_PREFIX)) return projectId.slice(LOCAL_PROJECT_PREFIX.length);
    return state.projects[0]?.id ?? state.addProject(defaultProjectName).id;
  }

  function documentForRequest(request: NewConfigRequest): GeneratorDocument {
    const document = createDefaultDocument(request.configType, localizedCommands);
    const preset = presets.find((item) => item.name === request.presetName);
    if (!preset) return document;
    for (const [name, value] of Object.entries(preset.values)) {
      const command = localizedCommands.find((item) => item.name === name);
      if (!command || !isCommandAvailable(request.configType, command)) continue;
      document.commandValues[name] = value;
      document.commandValues[`enabled:${name}`] = true;
    }
    return document;
  }

  async function createConfig(request: NewConfigRequest) {
    const document = documentForRequest(request);
    const isLocalTarget = !signedIn || request.projectId.startsWith(LOCAL_PROJECT_PREFIX);

    if (isLocalTarget) {
      const projectId = resolveLocalProjectId(request.projectId);
      const record = workspaceStore.getState()
        .addLocalConfig(projectId, request.name, request.configType, document);
      workspaceStore.getState().closeTab("new-config");
      workspaceStore.getState().openTab({ kind: "config", configId: record.id });
      toast.success(t("configCreated", { name: record.name }));
      return;
    }

    try {
      const saved = await createConfigMutation.mutateAsync({
        name: request.name,
        configType: request.configType,
        projectId: request.projectId === CLOUD_DEFAULT_PROJECT_ID ? undefined : request.projectId,
        values: document,
        rawConfig: serializeConfig(document, editorLocale, localizedCommands),
        mutationId: crypto.randomUUID(),
      });
      updateCachedConfig(saved);
      await queryClient.invalidateQueries({ queryKey: trpc.project.list.queryKey() });
      workspaceStore.getState().closeTab("new-config");
      workspaceStore.getState().openTab({ kind: "config", configId: saved.id });
      toast.success(t("configCreated", { name: saved.name }));
    } catch (error) {
      toast.error(error instanceof Error ? t(error.message) : t("Config konnte nicht angelegt werden."));
    }
  }

  async function submitProjectName(name: string) {
    const dialog = projectDialog;
    if (!dialog) return;
    const isLocal = !signedIn || Boolean(dialog.id?.startsWith(LOCAL_PROJECT_PREFIX));
    try {
      if (dialog.mode === "create") {
        if (isLocal) workspaceStore.getState().addProject(name);
        else {
          await createProjectMutation.mutateAsync({ name });
          await queryClient.invalidateQueries({ queryKey: trpc.project.list.queryKey() });
        }
      } else if (dialog.id) {
        if (isLocal) workspaceStore.getState().renameProject(dialog.id.slice(LOCAL_PROJECT_PREFIX.length), name);
        else {
          await renameProjectMutation.mutateAsync({ id: dialog.id, name });
          await queryClient.invalidateQueries({ queryKey: trpc.project.list.queryKey() });
        }
      }
      setProjectDialog(null);
    } catch (error) {
      toast.error(error instanceof Error ? t(error.message) : t("Projekt konnte nicht gespeichert werden."));
    }
  }

  async function removeProject(projectId: string) {
    if (projectId.startsWith(LOCAL_PROJECT_PREFIX)) {
      workspaceStore.getState().removeProject(projectId.slice(LOCAL_PROJECT_PREFIX.length));
      return;
    }
    try {
      const result = await deleteProjectMutation.mutateAsync({ id: projectId });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: trpc.project.list.queryKey() }),
        queryClient.invalidateQueries({ queryKey: trpc.config.list.queryKey() }),
      ]);
      toast.success(t("projectDeleted", { count: result.movedConfigs }));
    } catch (error) {
      toast.error(error instanceof Error ? t(error.message) : t("Projekt konnte nicht gelöscht werden."));
    }
  }

  /**
   * Moves every browser-only config into the account in one go, so the
   * workspace ends up with a single home instead of a permanent split.
   */
  async function transferLocalWorkspace() {
    setTransferPending(true);
    const projectIds = new Map<string, string>();
    let transferred = 0;
    try {
      for (const config of [...workspaceStore.getState().configs]) {
        let projectId = projectIds.get(config.projectId);
        if (!projectId) {
          const name = workspaceStore.getState().projects
            .find((project) => project.id === config.projectId)?.name ?? defaultProjectName;
          projectId = await resolveCloudProject(name);
          projectIds.set(config.projectId, projectId);
        }
        const saved = await createConfigMutation.mutateAsync({
          name: config.name,
          nameConflict: "rename",
          configType: config.configType,
          projectId,
          values: config.document,
          rawConfig: serializeConfig(config.document, editorLocale, localizedCommands),
          mutationId: crypto.randomUUID(),
        });
        updateCachedConfig(saved);
        if (openLocalIdRef.current === config.id) openLocalIdRef.current = null;
        const hadTab = workspaceStore.getState().tabs.some((tab) => tab.kind === "config" && tab.configId === config.id);
        workspaceStore.getState().removeLocalConfig(config.id);
        if (hadTab) workspaceStore.getState().openTab({ kind: "config", configId: saved.id });
        transferred += 1;
      }
      toast.success(t("localTransferDone", { count: transferred }));
    } catch (error) {
      toast.error(error instanceof Error ? t(error.message) : t("Übernahme fehlgeschlagen."));
    } finally {
      setTransferPending(false);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: trpc.project.list.queryKey() }),
        queryClient.invalidateQueries({ queryKey: trpc.config.list.queryKey() }),
      ]);
    }
  }

  /** Reuses a same-named account project so a transfer never duplicates folders. */
  async function resolveCloudProject(name: string) {
    const known = queryClient.getQueryData<typeof cloudProjects>(trpc.project.list.queryKey()) ?? cloudProjects;
    const existing = known.find((project) => project.name === name);
    if (existing) return existing.id;
    try {
      return (await createProjectMutation.mutateAsync({ name })).id;
    } catch {
      const refreshed = await queryClient.fetchQuery(trpc.project.list.queryOptions());
      const match = refreshed.find((project) => project.name === name);
      if (match) return match.id;
      return (await createProjectMutation.mutateAsync({ name: `${name} (2)`.slice(0, 60) })).id;
    }
  }

  function deleteFile(file: WorkspaceFile) {
    if (file.origin === "local") {
      workspaceStore.getState().removeLocalConfig(file.id);
      if (openLocalIdRef.current === file.id) openLocalIdRef.current = null;
      toast.success(t("Config gelöscht."));
      return;
    }
    const config = savedConfigs.find((item) => item.id === file.id);
    if (config) setDeleteCandidate(config);
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
      : t("Importierte Config");
    const document = parseConfigFiles(
      imports,
      activeConfigId ? generatorDocument : createDefaultDocument("matchmaking", localizedCommands),
      localizedCommands,
    );

    if (activeConfigId) {
      editorStore.getState().importDocument(document, importedName);
      toast.success(t("configImportSuccess", { count: files.length }));
      return;
    }
    // Without an open file the import becomes a new file rather than silently
    // overwriting whatever the editor happened to hold.
    const projectId = resolveLocalProjectId(null);
    const record = workspaceStore.getState()
      .addLocalConfig(projectId, importedName, document.configType, document);
    workspaceStore.getState().openTab({ kind: "config", configId: record.id });
    toast.success(t("configImportSuccess", { count: files.length }));
  }

  function requestImport() {
    importRef.current?.click();
  }

  function requestSave() {
    if (!signedIn) return setAuthOpen(true);
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
        : await createConfigMutation.mutateAsync({
          name: configName,
          configType: generatorDocument.configType,
          values: generatorDocument,
          rawConfig,
          mutationId,
        });
      const previousLocalId = openLocalIdRef.current;
      editorStore.getState().manualSaveSucceeded(saved);
      updateCachedConfig(saved);
      await removePendingAutosave(saved.id).catch(() => undefined);
      if (previousLocalId) {
        // The browser-only copy has become a cloud config; move the tab with it.
        openLocalIdRef.current = null;
        workspaceStore.getState().closeTab(`config:${previousLocalId}`);
        workspaceStore.getState().removeLocalConfig(previousLocalId);
        workspaceStore.getState().openTab({ kind: "config", configId: saved.id });
      }
      await queryClient.invalidateQueries({ queryKey: trpc.project.list.queryKey() });
      setCheckpointLabel("");
      setSaveOpen(false);
      toast.success(t("Config im Account gespeichert."));
    } catch (error) {
      toast.error(error instanceof Error ? t(error.message) : t("Speichern fehlgeschlagen."));
    }
  }

  async function deleteConfig(id: string) {
    try {
      const config = savedConfigs.find((item) => item.id === id);
      if (!config) return;
      await deleteConfigMutation.mutateAsync({ id, expectedRevision: config.revision, mutationId: crypto.randomUUID() });
      queryClient.setQueryData(trpc.config.list.queryKey(), (configs: SavedConfig[] | undefined) =>
        (configs ?? []).filter((item) => item.id !== id));
      await queryClient.invalidateQueries({ queryKey: trpc.config.trash.queryKey() });
      workspaceStore.getState().closeTab(`config:${id}`);
      if (currentId === id) editorStore.getState().detachCloud(t(defaultConfigName(generatorDocument.configType)));
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
      const document = normalizeDocument(historical.values, localizedCommands);
      const expectedRevision = historyConfig.id === currentId
        ? currentRevision
        : (savedConfigs.find((config) => config.id === historyConfig.id)?.revision ?? historyConfig.revision);
      const saved = await restoreMutation.mutateAsync({
        id: historyConfig.id,
        revision,
        expectedRevision,
        mutationId: crypto.randomUUID(),
        rawConfig: serializeConfig(document, editorLocale, localizedCommands),
      });
      editorStore.getState().manualSaveSucceeded(saved);
      updateCachedConfig(saved);
      await removePendingAutosave(saved.id).catch(() => undefined);
      setHistoryConfig(null);
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

  function resetDocument() {
    const document = createDefaultDocument(generatorDocument.configType, localizedCommands);
    replaceDocument(document);
    toast.success(t("Standardwerte wiederhergestellt."));
  }

  /* ------------------------------------------------------------- rendering */

  const tabDescriptors = useMemo(
    () => describeTabs(tabs.filter((tab) =>
      (tab.kind !== "admin" || canAdminister) && (tab.kind !== "moderation" || canModerate)), fileMap, dirtyConfigId),
    [canAdminister, canModerate, dirtyConfigId, fileMap, tabs],
  );

  function renderActive() {
    if (!activeTab) {
      return (
        <StartPage
          userName={user?.name ?? null}
          recent={recentFiles}
          onOpenFile={openFile}
          onNewConfig={() => openNewConfig()}
          onImport={requestImport}
          onOpenCommunity={() => navigateToTab({ kind: "community" })}
          onOpenAuth={() => setAuthOpen(true)}
        />
      );
    }

    switch (activeTab.kind) {
      case "community":
        return <CommunityFeed onOpenNewPost={() => navigateToTab({ kind: "community-post" })} />;
      case "community-post":
        return <CommunityNewPost files={files} />;
      case "commands":
        return <CommandRegisterPage commands={localizedCommands} />;
      case "new-config":
        return (
          <NewConfigPage
            key={newConfigProjectId ?? "default"}
            projects={projects}
            defaultProjectId={newConfigProjectId ?? projects[0]?.id ?? null}
            pending={createConfigMutation.isPending}
            onCancel={() => workspaceStore.getState().closeTab(activeTab.id)}
            onCreate={(request) => void createConfig(request)}
          />
        );
      case "trash":
        return (
          <TrashPage
            signedIn={signedIn}
            items={trashQuery.data ?? []}
            loading={signedIn && trashQuery.isPending}
            onUndelete={(config) => void undeleteConfig(config as TrashedConfig)}
            onSelectPermanentDelete={(config) => setPermanentDeleteCandidate(config as TrashedConfig)}
            onOpenAuth={() => setAuthOpen(true)}
          />
        );
      case "settings":
        return (
          <SettingsPage
            signedIn={signedIn}
            showAllCommands={showAllCommands}
            onShowAllCommandsChange={setShowAllCommands}
            onOpenAccount={() => setAccountOpen(true)}
            onOpenAuth={() => setAuthOpen(true)}
            onOpenTrash={() => navigateToTab({ kind: "trash" })}
            onOpenCommandRegister={() => navigateToTab({ kind: "commands" })}
          />
        );
      case "moderation":
        return canModerate ? <ModerationPage /> : null;
      case "admin":
        return canAdminister && user ? <AdminPage currentUserId={user.id} /> : null;
      case "config":
        if (!activeConfigReady) {
          const loadError = sync.status === "load-error" && sync.configId === activeTab.configId
            ? sync.message
            : null;
          return (
            <div className="page" aria-busy={!loadError}>
              <div className="page-inner">
                {loadError ? (
                  <div className="empty-state compact" role="alert">
                    <CircleAlert size={26} />
                    <h2>{t("Config konnte nicht geladen werden.")}</h2>
                    <p>{loadError}</p>
                    <button
                      type="button"
                      className="ghost-button"
                      onClick={() => void loadCloudConfig(activeTab.configId)}
                    >
                      {t("Erneut versuchen")}
                    </button>
                  </div>
                ) : (
                  <div className="page-loading" role="status" aria-live="polite">
                    <LoaderCircle className="spin" size={22} />
                    {t("Config wird geladen.")}
                  </div>
                )}
              </div>
            </div>
          );
        }
        return (
          <GeneratorWorkspace
            document={generatorDocument}
            configName={configName}
            query={query}
            showAllCommands={showAllCommands}
            commands={editorCommands}
            modules={availableModules}
            importRef={importRef}
            searchRef={searchRef}
            onQueryChange={setQuery}
            onShowAllCommandsChange={setShowAllCommands}
            onNameChange={setConfigName}
            onCommandChange={updateCommand}
            onDocumentChange={replaceDocument}
            onReset={resetDocument}
            onCreateCheckpoint={requestSave}
            canCheckpoint={signedIn && Boolean(currentId)}
          />
        );
      default:
        return (
          <StartPage
            userName={user?.name ?? null}
            recent={recentFiles}
            onOpenFile={openFile}
            onNewConfig={() => openNewConfig()}
            onImport={requestImport}
            onOpenCommunity={() => navigateToTab({ kind: "community" })}
            onOpenAuth={() => setAuthOpen(true)}
          />
        );
    }
  }

  return (
    <SidebarProvider
      className="app-shell"
      onPointerDownCapture={(event) => {
        if ((event.target as HTMLElement).closest('[data-slot="slider"]')) setSliderActive(true);
      }}
      onPointerUpCapture={() => setSliderActive(false)}
      onPointerCancelCapture={() => setSliderActive(false)}
    >
      <ActivityBar
        user={user}
        activeTabId={activeTabId}
        role={user?.role ?? null}
        onOpenStart={() => navigateToTab({ kind: "start" })}
        onOpenCommunity={() => navigateToTab({ kind: "community" })}
        onOpenCommands={() => navigateToTab({ kind: "commands" })}
        onOpenModeration={() => navigateToTab({ kind: "moderation" })}
        onOpenAdmin={() => navigateToTab({ kind: "admin" })}
        onOpenAccount={() => signedIn ? setAccountOpen(true) : setAuthOpen(true)}
        onOpenSettings={() => navigateToTab({ kind: "settings" })}
      />

      {explorerVisible && <AppSidebar
        user={user}
        tree={tree}
        localFiles={localShelf}
        activeConfigId={activeConfigId}
        activeTabId={activeTabId}
        dirtyConfigId={dirtyConfigId}
        loading={signedIn && configsQuery.isPending}
        transferPending={transferPending}
        onOpenFile={openFile}
        onNewConfig={openNewConfig}
        onNewProject={() => setProjectDialog({ mode: "create", name: "" })}
        onRenameProject={(id) => setProjectDialog({
          mode: "rename",
          id,
          name: projects.find((project) => project.id === id)?.name ?? "",
        })}
        onDeleteProject={(id) => void removeProject(id)}
        onDeleteFile={deleteFile}
        onOpenHistory={(file) => {
          const config = savedConfigs.find((item) => item.id === file.id);
          if (config) setHistoryConfig(config);
        }}
        onTransferLocal={() => void transferLocalWorkspace()}
        onOpenTrash={() => navigateToTab({ kind: "trash" })}
        onOpenCommands={() => navigateToTab({ kind: "commands" })}
        onImport={requestImport}
      />}

      <SidebarInset className="app-inset">
        <TabBar
          tabs={tabDescriptors}
          activeTabId={activeTabId}
          showPanelToggle={explorerVisible}
          sync={signedIn && activeConfigId
            ? (activeConfigReady || (sync.status === "load-error" && sync.configId === activeConfigId)
              ? sync
              : { status: "hydrating" })
            : null}
          output={activeConfigId && activeConfigReady
            ? { fileName: configDefinition.fileName, onOpen: () => setOutputOpen(true) }
            : null}
          onSelect={selectTab}
          onClose={closeTab}
        />
        {renderActive()}
      </SidebarInset>

      <input
        ref={importRef}
        type="file"
        accept=".cfg,.vcfg,.kv3,.txt,text/plain"
        multiple
        hidden
        onChange={(event) => void importConfig(event)}
      />

      <ConfigOutputDialog
        open={outputOpen}
        source={rawConfig}
        definition={configDefinition}
        configName={configName}
        lineCount={lineCount}
        conflictCount={conflictingKeys.size}
        copied={copied}
        onOpenChange={setOutputOpen}
        onCopy={() => void copyConfig()}
        onDownload={downloadConfig}
      />

      <ProjectNameDialog
        open={Boolean(projectDialog)}
        mode={projectDialog?.mode ?? "create"}
        initialName={projectDialog?.name ?? ""}
        pending={createProjectMutation.isPending || renameProjectMutation.isPending}
        onOpenChange={(open) => { if (!open) setProjectDialog(null); }}
        onSubmit={(name) => void submitProjectName(name)}
      />

      <GeneratorDialogs
        user={user}
        authProviders={authProviders}
        authOpen={authOpen}
        accountOpen={accountOpen}
        saveOpen={saveOpen}
        currentId={currentId}
        configName={configName}
        enabledCount={enabledCount}
        lineCount={lineCount}
        syncStatus={syncStatus}
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
        onNameChange={setConfigName}
        onCheckpointLabelChange={setCheckpointLabel}
        onRecoveryTimeChange={setRecoveryTime}
        onSave={persistConfig}
        onCloseHistory={() => setHistoryConfig(null)}
        onRestoreRevision={(revision) => void restoreRevision(revision)}
        onRestoreAtTime={(event) => void restoreAtTime(event)}
        onSelectDelete={(config) => setDeleteCandidate(config as SavedConfig | null)}
        onDelete={(config) => void deleteConfig(config.id)}
        onSelectPermanentDelete={(config) => setPermanentDeleteCandidate(config as TrashedConfig | null)}
        onPermanentDelete={(config) => void permanentlyDeleteConfig(config as TrashedConfig)}
      />
    </SidebarProvider>
  );
}
