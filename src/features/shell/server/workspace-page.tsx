import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { hasRole, type UserRole } from "@/features/auth/domain/roles";
import { getPublishedCommandCatalog } from "@/features/generator/catalog/server/catalog-repository";
import { AppShell } from "@/features/shell/components/app-shell";
import type { WorkspaceTabDescriptor } from "@/features/workspace/domain/workspace";

/**
 * Every addressable area renders the same workspace shell and only differs in
 * which tab it opens, so a deep link lands in a fully usable workspace.
 */
export async function WorkspacePage({
  initialTab,
  requiredRole,
}: {
  initialTab?: WorkspaceTabDescriptor;
  requiredRole?: UserRole;
}) {
  const [session, initialCatalog] = await Promise.all([auth(), getPublishedCommandCatalog()]);
  if (requiredRole && (!session?.user || !hasRole(session.user.role, requiredRole))) {
    redirect("/");
  }

  return (
    <AppShell
      user={session?.user ?? null}
      initialCatalog={initialCatalog}
      initialTab={initialTab}
      authProviders={{
        discord: Boolean(process.env.AUTH_DISCORD_ID && process.env.AUTH_DISCORD_SECRET),
        steam: Boolean(process.env.STEAM_WEB_API_KEY),
      }}
    />
  );
}
