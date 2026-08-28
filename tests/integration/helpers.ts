import type { Session } from "next-auth";
import { appRouter } from "@/trpc/router";
import { createDefaultDocument } from "@/features/generator/domain/document";
import type { UserRole } from "@/features/auth/domain/roles";

export const testDocument = () => createDefaultDocument("matchmaking");

export function caller(userId?: string, role: UserRole = "user") {
  const session: Session | null = userId
    ? {
        expires: new Date(Date.now() + 60_000).toISOString(),
        user: { id: userId, name: "Test User", email: "test@example.com", role },
      }
    : null;
  return appRouter.createCaller({
    session,
    request: new Request("http://integration.test/api/trpc", {
      headers: { "x-forwarded-for": `127.0.0.${Math.floor(Math.random() * 200) + 1}` },
    }),
  });
}
