import { createTRPCRouter } from "@/trpc/init";
import { accountRouter } from "@/trpc/routers/account";
import { authRouter } from "@/trpc/routers/auth";
import { configRouter } from "@/trpc/routers/config";

export const appRouter = createTRPCRouter({
  account: accountRouter,
  auth: authRouter,
  config: configRouter,
});

export type AppRouter = typeof appRouter;
