import type { WorkspaceTab, WorkspaceTabDescriptor } from "./workspace";

/**
 * The addressable areas of the workspace. Config tabs stay on "/" for now —
 * a browser-only file has no id anyone else could open.
 */
const routes = {
  "/": { kind: "start" },
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
  return pathByKind.get(tab.kind) ?? "/";
}

export function tabForPath(path: string): WorkspaceTabDescriptor | null {
  const normalized = path.replace(/\/+$/, "") || "/";
  return routes[normalized as WorkspaceRoute] ?? null;
}
