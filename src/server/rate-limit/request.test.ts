import { describe, expect, it } from "vitest";
import { clientIp } from "./request";

describe("client IP resolution", () => {
  it("does not trust spoofable forwarding headers without explicit proxy trust", () => {
    const previousTrust = process.env.AUTH_TRUST_HOST;
    process.env.AUTH_TRUST_HOST = "false";
    try {
      const request = new Request("https://config.example", {
        headers: { "x-forwarded-for": "198.51.100.9" },
      });
      expect(clientIp(request)).toBe("direct-client");
    } finally {
      process.env.AUTH_TRUST_HOST = previousTrust;
    }
  });

  it("selects the client before the configured number of trusted proxy hops", () => {
    const previousTrust = process.env.AUTH_TRUST_HOST;
    const previousCount = process.env.TRUSTED_PROXY_COUNT;
    process.env.AUTH_TRUST_HOST = "true";
    process.env.TRUSTED_PROXY_COUNT = "2";
    try {
      const request = new Request("https://config.example", {
        headers: { "x-forwarded-for": "203.0.113.7, 198.51.100.9, 10.0.0.5" },
      });
      expect(clientIp(request)).toBe("198.51.100.9");
    } finally {
      process.env.AUTH_TRUST_HOST = previousTrust;
      process.env.TRUSTED_PROXY_COUNT = previousCount;
    }
  });
});
