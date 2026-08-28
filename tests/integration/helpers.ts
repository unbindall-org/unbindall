import type { Session } from "next-auth";
import { appRouter } from "@/trpc/router";
import { createDefaultDocument } from "@/features/generator/domain/document";

export const testDocument = () => createDefaultDocument("matchmaking");

export function caller(userId?: string) {
  const session: Session | null = userId
    ? {
        expires: new Date(Date.now() + 60_000).toISOString(),
        user: { id: userId, name: "Test User", email: "test@example.com" },
      }
    : null;
  return appRouter.createCaller({
    session,
    request: new Request("http://integration.test/api/trpc", {
      headers: { "x-forwarded-for": `127.0.0.${Math.floor(Math.random() * 200) + 1}` },
    }),
  });
}
