import { describe, expect, it } from "vitest";
import { authSecret, validateProductionEnvironment } from "./environment";

const validProductionEnvironment: NodeJS.ProcessEnv = {
  NODE_ENV: "production",
  AUTH_SECRET: "a-cryptographically-random-secret-with-32-characters",
  AUTH_URL: "https://config.example",
  AUTH_EXPECTED_HOST: "config.example",
  AUTH_TRUST_HOST: "true",
  TRUSTED_PROXY_COUNT: "1",
  DATABASE_URL: "postgresql://user:pass@project-pooler.example/neondb?sslmode=require",
  REDIS_URL: "rediss://default:secret@redis.example:6380",
  AUTH_DISCORD_ID: "discord-id",
  AUTH_DISCORD_SECRET: "discord-secret",
};

describe("production environment validation", () => {
  it("accepts a complete, TLS-protected production environment", () => {
    expect(() => validateProductionEnvironment(validProductionEnvironment)).not.toThrow();
    expect(authSecret(validProductionEnvironment)).toBe(validProductionEnvironment.AUTH_SECRET);
  });

  it("rejects default secrets, unexpected hosts and unpooled or plaintext database URLs", () => {
    expect(() => validateProductionEnvironment({
      ...validProductionEnvironment,
      AUTH_SECRET: "local-development-secret-change-me-please",
      AUTH_URL: "https://attacker.example",
      DATABASE_URL: "postgresql://user:pass@project.example/neondb",
    })).toThrow(/AUTH_SECRET[\s\S]*AUTH_URL[\s\S]*gepoolten[\s\S]*TLS/);
  });

  it("rejects partial Discord configuration and unsubstantiated host trust", () => {
    expect(() => validateProductionEnvironment({
      ...validProductionEnvironment,
      AUTH_DISCORD_SECRET: undefined,
      TRUSTED_PROXY_COUNT: undefined,
    })).toThrow(/AUTH_DISCORD[\s\S]*TRUSTED_PROXY_COUNT/);
  });

  it("permits the development secret only outside the production runtime", () => {
    expect(authSecret({ NODE_ENV: "development" })).toBe("local-development-secret-change-me-please");
    expect(() => authSecret({ NODE_ENV: "production" })).toThrow(/AUTH_SECRET/);
  });

  it("permits only the exact local environment used by the production-container smoke test", () => {
    const smokeEnvironment: NodeJS.ProcessEnv = {
      NODE_ENV: "production",
      UNBINDALL_CONTAINER_SMOKE_TEST: "true",
      AUTH_SECRET: "container-smoke-secret-at-least-32-characters",
      AUTH_URL: "http://127.0.0.1:3100",
      AUTH_TRUST_HOST: "true",
      TRUSTED_PROXY_COUNT: "1",
      DATABASE_URL: "postgresql://unbindall:unbindall@db:5432/unbindall_test",
      REDIS_URL: "redis://redis:6379",
    };
    expect(() => validateProductionEnvironment(smokeEnvironment)).not.toThrow();
    expect(() => validateProductionEnvironment({
      ...smokeEnvironment,
      DATABASE_URL: "postgresql://prod:prod@db:5432/production",
    })).toThrow(/gepoolten/);
  });
});
