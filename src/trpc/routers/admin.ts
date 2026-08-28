import { TRPCError } from "@trpc/server";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { users } from "@/db/schema";
import { userRoles } from "@/features/auth/domain/roles";
import { createTRPCRouter, platformAdminProcedure } from "@/trpc/init";

export const adminRouter = createTRPCRouter({
  users: platformAdminProcedure.query(async () => {
    return db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        image: users.image,
        role: users.role,
        createdAt: users.createdAt,
      })
      .from(users)
      .orderBy(asc(users.createdAt));
  }),

  setUserRole: platformAdminProcedure
    .input(z.object({ userId: z.string().min(1), role: z.enum(userRoles) }))
    .mutation(async ({ ctx, input }) => {
      if (input.userId === ctx.userId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Die eigene Admin-Rolle kann hier nicht geändert werden.",
        });
      }

      const [updated] = await db
        .update(users)
        .set({ role: input.role, updatedAt: new Date() })
        .where(eq(users.id, input.userId))
        .returning({ id: users.id, role: users.role });

      if (!updated) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Account nicht gefunden." });
      }

      return updated;
    }),
});

