import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL muss auf die gepoolte Neon-Verbindung zeigen.");
}

const globalForDb = globalThis as unknown as {
  postgresClient?: ReturnType<typeof postgres>;
};

const configuredPoolSize = Number(process.env.DATABASE_POOL_MAX);
const poolSize = Number.isInteger(configuredPoolSize) && configuredPoolSize > 0
  ? configuredPoolSize
  : process.env.NODE_ENV === "production" ? 10 : 1;
const configuredConnectTimeout = Number(process.env.DATABASE_CONNECT_TIMEOUT_SECONDS);
const connectTimeout = Number.isFinite(configuredConnectTimeout) && configuredConnectTimeout > 0
  ? configuredConnectTimeout
  : 5;

const client =
  globalForDb.postgresClient ??
  postgres(connectionString, {
    max: poolSize,
    connect_timeout: connectTimeout,
    prepare: false,
  });

if (process.env.NODE_ENV !== "production") globalForDb.postgresClient = client;

export const db = drizzle(client, { schema });
