import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { hasRole, type UserRole } from "@/features/auth/domain/roles";
import { getPublishedCommandCatalog } from "@/features/generator/catalog/server/catalog-repository";
import { AppShell } from "@/features/shell/components/app-shell";
import type { WorkspaceTabDescriptor } from "@/features/workspace/domain/workspace";
import { appRouter } from "@/trpc/router";

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

  const caller = appRouter.createCaller({ session });
  const [initialConfigs, initialProjects] = session?.user
    ? await Promise.all([caller.config.list(), caller.project.list()])
    : [[], []];
  const requestedConfigId = initialTab?.kind === "config" ? initialTab.configId : null;
  const initialConfig = requestedConfigId && initialConfigs.some((config) => config.id === requestedConfigId)
    ? await caller.config.get({ id: requestedConfigId })
    : null;

  // A shared post link is the one deep link strangers actually receive, so it
  // renders its content on the server instead of a loading state.
  const initialPost = initialTab?.kind === "community-detail"
    ? await caller.community.bySlug({ slug: initialTab.slug }).catch(() => null)
    : null;

  return (
    <AppShell
      user={session?.user ?? null}
      initialCatalog={initialCatalog}
      initialConfigs={initialConfigs}
      initialProjects={initialProjects}
      initialConfig={initialConfig}
      initialPost={initialPost}
      initialTab={initialTab}
      authProviders={{
        discord: Boolean(process.env.AUTH_DISCORD_ID && process.env.AUTH_DISCORD_SECRET),
        steam: Boolean(process.env.STEAM_WEB_API_KEY),
      }}
    />
  );
}
