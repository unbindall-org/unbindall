import { describe, expect, it } from "vitest";
import { enforceRateLimits, RateLimitExceededError, rateLimitPolicies } from ".";
import { MemoryRateLimitStore, type RateLimitStore } from "./store";

describe("central rate limiter", () => {
  it("allows the configured number of attempts and then rejects", async () => {
    const store = new MemoryRateLimitStore();
    const attempt = { policy: "registrationIp" as const, identifier: "ip:192.0.2.1" };

    for (let index = 0; index < rateLimitPolicies.registrationIp.limit; index += 1) {
      await expect(enforceRateLimits([attempt], store)).resolves.toBeUndefined();
    }
    await expect(enforceRateLimits([attempt], store)).rejects.toBeInstanceOf(RateLimitExceededError);
  });

  it("keeps identifiers isolated", async () => {
    const store = new MemoryRateLimitStore();
    const limit = rateLimitPolicies.accountDeleteAccount.limit;
    for (let index = 0; index < limit; index += 1) {
      await enforceRateLimits([{ policy: "accountDeleteAccount", identifier: "account:a" }], store);
    }
    await expect(enforceRateLimits([
      { policy: "accountDeleteAccount", identifier: "account:b" },
    ], store)).resolves.toBeUndefined();
  });

  it("fails closed when the backing store is unavailable", async () => {
    const unavailable: RateLimitStore = {
      increment: async () => { throw new Error("redis offline"); },
    };
    await expect(enforceRateLimits([
      { policy: "registrationIp", identifier: "ip:192.0.2.1" },
    ], unavailable)).rejects.toMatchObject({ name: "RateLimitUnavailableError" });
  });
});

