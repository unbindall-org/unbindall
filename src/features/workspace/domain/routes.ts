import type { WorkspaceTab, WorkspaceTabDescriptor } from "./workspace";

/** The addressable, reload-safe areas of the workspace. */
const routes = {
  "/": { kind: "start" },
  "/configs/new": { kind: "new-config" },
  "/community": { kind: "community" },
  "/community/new": { kind: "community-post" },
  "/papierkorb": { kind: "trash" },
  "/register": { kind: "commands" },
  "/einstellungen": { kind: "settings" },
  "/moderation": { kind: "moderation" },
  "/admin": { kind: "admin" },
} as const satisfies Record<string, WorkspaceTabDescriptor>;

export type WorkspaceRoute = keyof typeof routes;

const pathByKind = new Map<WorkspaceTabDescriptor["kind"], string>(
  Object.entries(routes).map(([path, descriptor]) => [descriptor.kind, path]),
);

export function pathForTab(tab: WorkspaceTab | WorkspaceTabDescriptor | null) {
  if (!tab) return "/";
  if (tab.kind === "config") return `/configs/${encodeURIComponent(tab.configId)}`;
  return pathByKind.get(tab.kind) ?? "/";
}

export function tabForPath(path: string): WorkspaceTabDescriptor | null {
  const normalized = path.replace(/\/+$/, "") || "/";
  const staticRoute = routes[normalized as WorkspaceRoute];
  if (staticRoute) return staticRoute;
  const configMatch = normalized.match(/^\/configs\/([^/]+)$/);
  if (configMatch) {
    try {
      return { kind: "config", configId: decodeURIComponent(configMatch[1]) };
    } catch {
      return null;
    }
  }
  return null;
}
