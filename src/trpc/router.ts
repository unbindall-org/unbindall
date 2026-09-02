import { createTRPCRouter } from "@/trpc/init";
import { accountRouter } from "@/trpc/routers/account";
import { adminRouter } from "@/trpc/routers/admin";
import { authRouter } from "@/trpc/routers/auth";
import { configRouter } from "@/trpc/routers/config";
import { catalogRouter } from "@/trpc/routers/catalog";
import { communityRouter } from "@/trpc/routers/community";
import { moderationRouter } from "@/trpc/routers/moderation";
import { projectRouter } from "@/trpc/routers/project";

export const appRouter = createTRPCRouter({
  account: accountRouter,
  admin: adminRouter,
  auth: authRouter,
  catalog: catalogRouter,
  community: communityRouter,
  config: configRouter,
  moderation: moderationRouter,
  project: projectRouter,
});

export type AppRouter = typeof appRouter;
