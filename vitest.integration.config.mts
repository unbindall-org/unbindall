import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const databaseUrl = process.env.TEST_DATABASE_URL;

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "server-only": fileURLToPath(new URL("./node_modules/server-only/empty.js", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["tests/integration/**/*.integration.test.ts"],
    fileParallelism: false,
    globalSetup: ["./tests/integration/global-setup.ts"],
    setupFiles: ["./tests/integration/setup.ts"],
    testTimeout: 20_000,
    hookTimeout: 30_000,
    env: {
      DATABASE_URL: databaseUrl ?? "",
      AUTH_SECRET: "integration-test-secret-at-least-32-characters",
      AUTH_TRUST_HOST: "true",
      TRUSTED_PROXY_COUNT: "1",
      DATABASE_POOL_MAX: "5",
    },
  },
});
