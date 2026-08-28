import postgres from "postgres";

export function testDatabaseUrl() {
  const value = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
  if (!value) {
    throw new Error("TEST_DATABASE_URL fehlt. Starte PostgreSQL mit `pnpm test:db:up`.");
  }

  const url = new URL(value);
  const local = ["localhost", "127.0.0.1", "::1", "db"].includes(url.hostname);
  if (!local && !url.pathname.toLowerCase().includes("test")) {
    throw new Error("Integrationstests dürfen nur eine lokale oder als Test markierte Datenbank verwenden.");
  }
  return value;
}

export function testSql(max = 1) {
  return postgres(testDatabaseUrl(), { max, prepare: false });
}
