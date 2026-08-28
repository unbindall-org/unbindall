import { auth } from "@/auth";
import type { TRPCContext } from "@/trpc/init";

export async function createTRPCContext(): Promise<TRPCContext> {
  return { session: await auth() };
}
