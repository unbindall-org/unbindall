import { initTRPC, TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import type { Session } from "next-auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { hasRole, type UserRole } from "@/features/auth/domain/roles";

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

function procedureForRole(requiredRole: UserRole) {
  return protectedProcedure.use(async ({ ctx, next }) => {
    const [user] = await db
      .select({ role: users.role })
      .from(users)
      .where(eq(users.id, ctx.userId))
      .limit(1);

    if (!user || !hasRole(user.role, requiredRole)) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Keine Berechtigung für diesen Bereich." });
    }

    return next({ ctx: { ...ctx, role: user.role } });
  });
}

export const moderatorProcedure = procedureForRole("moderator");
export const platformAdminProcedure = procedureForRole("platform_admin");
// Existing catalog procedures use this name; platform admins are the admin role.
export const adminProcedure = platformAdminProcedure;
