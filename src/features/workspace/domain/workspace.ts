import { createDefaultDocument } from "@/features/generator/domain/document";
import type { ConfigType, GeneratorDocument } from "@/features/generator/domain/types";
import { CONFIG_TYPES } from "@/features/generator/domain/types";

export const WORKSPACE_SCHEMA_VERSION = 1 as const;
export const defaultProjectName = "Mein Setup";

/**
 * A project is the folder around config files. It carries no settings of its
 * own — it exists so a player can keep one coherent CS2 setup (autoexec,
 * practice, server …) together and later share it as a unit.
 */
export type WorkspaceProject = {
  id: string;
  name: string;
  position: number;
};

/**
 * Configs of signed-out visitors live entirely in the browser. The shape mirrors
 * the cloud row so the sidebar renders both from one file type.
 */
export type LocalConfigRecord = {
  id: string;
  projectId: string;
  name: string;
  configType: ConfigType;
  document: GeneratorDocument;
  updatedAt: string;
};

export type WorkspaceFileOrigin = "local" | "cloud";

/** Normalized file entry the sidebar and tab bar render, whatever its source. */
export type WorkspaceFile = {
  id: string;
  projectId: string;
  name: string;
  configType: ConfigType;
  origin: WorkspaceFileOrigin;
  updatedAt: string;
};

export type WorkspaceTree = Array<WorkspaceProject & { files: WorkspaceFile[] }>;

export type StoredWorkspace = {
  schemaVersion: typeof WORKSPACE_SCHEMA_VERSION;
  projects: WorkspaceProject[];
  configs: LocalConfigRecord[];
  tabs: WorkspaceTabDescriptor[];
  activeTabId: string | null;
};

export type WorkspaceTabDescriptor =
  | { kind: "start" }
  | { kind: "new-config" }
  | { kind: "config"; configId: string }
  | { kind: "community" }
  | { kind: "community-post" }
  | { kind: "community-detail"; slug: string }
  | { kind: "community-mine" }
  | { kind: "profile"; handle: string }
  | { kind: "trash" }
  | { kind: "commands" }
  | { kind: "settings" }
  | { kind: "moderation" }
  | { kind: "admin" };

export type WorkspaceTab = WorkspaceTabDescriptor & { id: string };

export function tabId(descriptor: WorkspaceTabDescriptor) {
  if (descriptor.kind === "config") return `config:${descriptor.configId}`;
  if (descriptor.kind === "community-detail") return `community-detail:${descriptor.slug}`;
  if (descriptor.kind === "profile") return `profile:${descriptor.handle}`;
  return descriptor.kind;
}

export function toTab(descriptor: WorkspaceTabDescriptor): WorkspaceTab {
  return { ...descriptor, id: tabId(descriptor) };
}

/**
 * The file explorer belongs to the configurator and stays available in the
 * trash so users keep their workspace context. Other standalone pages —
 * community, the command register, settings — run without it. No tab at all
 * means the workspace root, which keeps the explorer.
 */
const explorerTabKinds = new Set<WorkspaceTabDescriptor["kind"]>(["config", "new-config", "start", "trash"]);

export function tabUsesExplorer(tab: WorkspaceTabDescriptor | null) {
  return !tab || explorerTabKinds.has(tab.kind);
}

export function createId() {
  return globalThis.crypto?.randomUUID?.() ?? `id-${Math.random().toString(36).slice(2)}`;
}

export function createProject(name: string, position = 0): WorkspaceProject {
  return { id: createId(), name, position };
}

export function createLocalConfig(
  projectId: string,
  name: string,
  configType: ConfigType,
  document?: GeneratorDocument,
): LocalConfigRecord {
  return {
    id: createId(),
    projectId,
    name,
    configType,
    document: document ?? createDefaultDocument(configType),
    updatedAt: new Date().toISOString(),
  };
}

export function createEmptyWorkspace(): StoredWorkspace {
  const project = createProject(defaultProjectName);
  return {
    schemaVersion: WORKSPACE_SCHEMA_VERSION,
    projects: [project],
    configs: [],
    tabs: [{ kind: "start" }],
    activeTabId: "start",
  };
}

function isConfigType(value: unknown): value is ConfigType {
  return CONFIG_TYPES.includes(value as ConfigType);
}

function normalizeProjects(value: unknown): WorkspaceProject[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is WorkspaceProject =>
      Boolean(item) && typeof item === "object" &&
      typeof (item as WorkspaceProject).id === "string" &&
      typeof (item as WorkspaceProject).name === "string")
    .map((project, index) => ({
      id: project.id,
      name: project.name.slice(0, 60),
      position: typeof project.position === "number" ? project.position : index,
    }));
}

function normalizeTabs(value: unknown): WorkspaceTabDescriptor[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item): WorkspaceTabDescriptor[] => {
    if (!item || typeof item !== "object") return [];
    const kind = (item as WorkspaceTabDescriptor).kind;
    if (kind === "config") {
      const configId = (item as { configId?: unknown }).configId;
      return typeof configId === "string" ? [{ kind, configId }] : [];
    }
    if (kind === "community-detail") {
      const slug = (item as { slug?: unknown }).slug;
      return typeof slug === "string" ? [{ kind, slug }] : [];
    }
    if (kind === "profile") {
      const handle = (item as { handle?: unknown }).handle;
      return typeof handle === "string" ? [{ kind, handle }] : [];
    }
    return [
      "start", "new-config", "community", "community-post", "community-mine",
      "trash", "commands", "settings", "moderation", "admin",
    ].includes(kind as string)
      ? [{ kind } as WorkspaceTabDescriptor]
      : [];
  });
}

/**
 * Reading never throws and never returns a workspace without a project — an
 * unreadable or half-written entry must not be able to lock the user out.
 */
export function normalizeWorkspace(
  value: unknown,
  normalizeDocument: (input: unknown) => GeneratorDocument,
): StoredWorkspace {
  const candidate = value && typeof value === "object" ? value as Record<string, unknown> : null;
  if (!candidate) return createEmptyWorkspace();

  const projects = normalizeProjects(candidate.projects);
  const resolvedProjects = projects.length ? projects : [createProject(defaultProjectName)];
  const projectIds = new Set(resolvedProjects.map((project) => project.id));
  const fallbackProjectId = resolvedProjects[0].id;

  const configs = Array.isArray(candidate.configs)
    ? candidate.configs.flatMap((item): LocalConfigRecord[] => {
      if (!item || typeof item !== "object") return [];
      const record = item as Partial<LocalConfigRecord>;
      if (typeof record.id !== "string" || typeof record.name !== "string") return [];
      const configType = isConfigType(record.configType) ? record.configType : "matchmaking";
      return [{
        id: record.id,
        projectId: typeof record.projectId === "string" && projectIds.has(record.projectId)
          ? record.projectId
          : fallbackProjectId,
        name: record.name.slice(0, 60),
        configType,
        document: normalizeDocument(record.document),
        updatedAt: typeof record.updatedAt === "string" ? record.updatedAt : new Date().toISOString(),
      }];
    })
    : [];

  const configIds = new Set(configs.map((config) => config.id));
  const tabs = normalizeTabs(candidate.tabs)
    .filter((tab) => tab.kind !== "config" || configIds.has(tab.configId));
  const resolvedTabs = tabs.length ? tabs : [{ kind: "start" } as WorkspaceTabDescriptor];
  const tabIds = new Set(resolvedTabs.map(tabId));
  const activeTabId = typeof candidate.activeTabId === "string" && tabIds.has(candidate.activeTabId)
    ? candidate.activeTabId
    : tabId(resolvedTabs[0]);

  return {
    schemaVersion: WORKSPACE_SCHEMA_VERSION,
    projects: resolvedProjects,
    configs,
    tabs: resolvedTabs,
    activeTabId,
  };
}

export function buildTree(
  projects: WorkspaceProject[],
  files: WorkspaceFile[],
): WorkspaceTree {
  const ordered = [...projects].sort((a, b) => a.position - b.position || a.name.localeCompare(b.name));
  const known = new Set(ordered.map((project) => project.id));
  const orphans = files.filter((file) => !known.has(file.projectId));
  return ordered.map((project, index) => ({
    ...project,
    files: files
      .filter((file) => file.projectId === project.id || (index === 0 && orphans.includes(file)))
      .sort((a, b) => a.name.localeCompare(b.name)),
  }));
}
