import { createHmac } from "node:crypto";
import { getAuthSecret } from "@/features/auth/server/auth-secret";
import { rateLimitPolicies, type RateLimitPolicyName } from "./policies";
import { clientIp } from "./request";
import { defaultRateLimitStore, type RateLimitStore } from "./store";

export { clientIp, rateLimitPolicies };
export type { RateLimitPolicyName, RateLimitStore };

export class RateLimitExceededError extends Error {
  constructor(
    readonly policy: RateLimitPolicyName,
    readonly retryAfterSeconds: number,
  ) {
    super("Zu viele Anfragen. Bitte versuche es später erneut.");
    this.name = "RateLimitExceededError";
  }
}

export class RateLimitUnavailableError extends Error {
  constructor(options?: ErrorOptions) {
    super("Rate-Limiting ist vorübergehend nicht verfügbar.", options);
    this.name = "RateLimitUnavailableError";
  }
}

export type RateLimitAttempt = { policy: RateLimitPolicyName; identifier: string };

function redisKey({ policy, identifier }: RateLimitAttempt) {
  const digest = createHmac("sha256", getAuthSecret())
    .update(`${policy}\0${identifier.trim().toLowerCase()}`)
    .digest("hex");
  return `unbindall:rate-limit:${policy}:${digest}`;
}

export async function enforceRateLimits(attempts: RateLimitAttempt[], store = defaultRateLimitStore()) {
  try {
    for (const attempt of attempts) {
      const policy = rateLimitPolicies[attempt.policy];
      const result = await store.increment(redisKey(attempt), policy.windowMs);
      if (result.count > policy.limit) {
        throw new RateLimitExceededError(attempt.policy, Math.max(1, Math.ceil(result.ttlMs / 1_000)));
      }
    }
  } catch (error) {
    if (error instanceof RateLimitExceededError) throw error;
    throw new RateLimitUnavailableError({ cause: error });
  }
}

export function requestRateLimit(policy: RateLimitPolicyName, request?: Request): RateLimitAttempt {
  return { policy, identifier: `ip:${clientIp(request)}` };
}

export function accountRateLimit(policy: RateLimitPolicyName, userId: string): RateLimitAttempt {
  return { policy, identifier: `account:${userId}` };
}

export function loginRateLimit(email: string): RateLimitAttempt {
  return { policy: "credentialsLoginAccount", identifier: `login:${email}` };
}
