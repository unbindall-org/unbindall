import { auth } from "@/auth";
import type { TRPCContext } from "@/trpc/init";

export async function createTRPCContext(request: Request): Promise<TRPCContext> {
  return { session: await auth(), request };
}
