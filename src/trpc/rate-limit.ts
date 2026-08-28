import { TRPCError } from "@trpc/server";
import {
  enforceRateLimits,
  RateLimitExceededError,
  type RateLimitAttempt,
} from "@/server/rate-limit";

export async function enforceTRPCRateLimits(attempts: RateLimitAttempt[]) {
  try {
    await enforceRateLimits(attempts);
  } catch (error) {
    if (error instanceof RateLimitExceededError) {
      throw new TRPCError({
        code: "TOO_MANY_REQUESTS",
        message: error.message,
        cause: error,
      });
    }
    throw new TRPCError({
      code: "SERVICE_UNAVAILABLE",
      message: "Anfrage kann vorübergehend nicht sicher verarbeitet werden.",
      cause: error,
    });
  }
}

