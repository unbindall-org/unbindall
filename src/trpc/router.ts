import { createTRPCRouter } from "@/trpc/init";
import { accountRouter } from "@/trpc/routers/account";
import { adminRouter } from "@/trpc/routers/admin";
import { authRouter } from "@/trpc/routers/auth";
import { configRouter } from "@/trpc/routers/config";
import { catalogRouter } from "@/trpc/routers/catalog";
import { projectRouter } from "@/trpc/routers/project";

export const appRouter = createTRPCRouter({
  account: accountRouter,
  admin: adminRouter,
  auth: authRouter,
  catalog: catalogRouter,
  config: configRouter,
  project: projectRouter,
});

export type AppRouter = typeof appRouter;
