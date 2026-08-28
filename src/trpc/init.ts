import { initTRPC, TRPCError } from "@trpc/server";
import type { Session } from "next-auth";

export type TRPCContext = {
  session: Session | null;
  /** Present for HTTP calls; omitted only by trusted in-process callers/tests. */
  request?: Request;
};

const t = initTRPC.context<TRPCContext>().create();

export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure;
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  const userId = ctx.session?.user.id;

  if (!userId) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Nicht angemeldet." });
  }

  return next({
    ctx: {
      ...ctx,
      session: ctx.session,
      userId,
    },
  });
});
