import { TRPCError } from "@trpc/server";
import { hash } from "bcryptjs";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { users } from "@/db/schema";
import { requestRateLimit } from "@/server/rate-limit";
import { createTRPCRouter, publicProcedure } from "@/trpc/init";
import { enforceTRPCRateLimits } from "@/trpc/rate-limit";

const registrationInput = z.object({
  name: z.string().trim().min(2).max(50),
  email: z.email().transform((value) => value.toLowerCase()),
  password: z.string().min(8).max(128),
});

export const authRouter = createTRPCRouter({
  register: publicProcedure.input(registrationInput).mutation(async ({ ctx, input }) => {
    // This must happen before querying the address and before bcrypt consumes CPU.
    await enforceTRPCRateLimits([requestRateLimit("registrationIp", ctx.request)]);

    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, input.email))
      .limit(1);

    if (existing) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "Für diese E-Mail existiert bereits ein Account.",
      });
    }

    await db.insert(users).values({
      id: crypto.randomUUID(),
      name: input.name,
      email: input.email,
      passwordHash: await hash(input.password, 12),
    });

    return { ok: true };
  }),
});
