import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3200";
const databaseUrl = process.env.TEST_DATABASE_URL
  ?? "postgresql://unbindall:unbindall@127.0.0.1:55432/unbindall_test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  globalSetup: "./tests/e2e/global-setup.ts",
  use: {
    baseURL,
    locale: "de-DE",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: process.env.PLAYWRIGHT_BASE_URL ? undefined : {
    command: "pnpm dev --hostname 127.0.0.1 --port 3200",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      NEXT_DIST_DIR: ".next-e2e",
      DATABASE_URL: databaseUrl,
      AUTH_SECRET: "e2e-test-secret-at-least-32-characters",
      AUTH_URL: baseURL,
      AUTH_TRUST_HOST: "true",
    },
  },
});
