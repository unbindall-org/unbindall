const developmentAuthSecret = "local-development-secret-change-me-please";
const insecureAuthSecrets = new Set([
  developmentAuthSecret,
  "replace-with-at-least-32-random-characters",
  "changeme",
]);

function parseUrl(name: string, value: string | undefined, errors: string[]) {
  if (!value) {
    errors.push(`${name} fehlt.`);
    return null;
  }
  try {
    return new URL(value);
  } catch {
    errors.push(`${name} ist keine gültige URL.`);
    return null;
  }
}

function isExplicitContainerSmokeEnvironment(env: NodeJS.ProcessEnv) {
  if (env.UNBINDALL_CONTAINER_SMOKE_TEST !== "true") return false;
  try {
    const authUrl = new URL(env.AUTH_URL ?? "");
    const databaseUrl = new URL(env.DATABASE_URL ?? "");
    return authUrl.protocol === "http:"
      && ["127.0.0.1", "localhost"].includes(authUrl.hostname)
      && databaseUrl.hostname === "db"
      && databaseUrl.pathname === "/unbindall_test"
      && env.AUTH_TRUST_HOST === "true"
      && env.TRUSTED_PROXY_COUNT === "1";
  } catch {
    return false;
  }
}

/**
 * Validates deployment invariants without reading any module-global state. This
 * makes the same checks usable during server startup and in unit tests.
 */
export function validateProductionEnvironment(env: NodeJS.ProcessEnv = process.env) {
  // `next build` statically evaluates server modules without runtime secrets.
  // The standalone server calls this again through instrumentation at startup.
  if (env.NODE_ENV !== "production" || env.NEXT_PHASE === "phase-production-build") return;
  // The production image is also exercised against an isolated local Compose
  // network. The exception is deliberately limited to loopback HTTP and the
  // exact disposable database service/name used by that smoke test.
  const containerSmoke = isExplicitContainerSmokeEnvironment(env);

  const errors: string[] = [];
  const secret = env.AUTH_SECRET;
  if (!secret || secret.length < 32 || insecureAuthSecrets.has(secret)) {
    errors.push("AUTH_SECRET muss mindestens 32 zufällige Zeichen lang sein und darf kein Defaultwert sein.");
  }

  const authUrl = parseUrl("AUTH_URL", env.AUTH_URL, errors);
  const expectedHost = env.AUTH_EXPECTED_HOST?.trim().toLowerCase();
  if (!expectedHost && !containerSmoke) errors.push("AUTH_EXPECTED_HOST fehlt.");
  if (authUrl) {
    if (authUrl.protocol !== "https:" && !containerSmoke) errors.push("AUTH_URL muss HTTPS verwenden.");
    if (authUrl.username || authUrl.password || authUrl.pathname !== "/" || authUrl.search || authUrl.hash) {
      errors.push("AUTH_URL muss eine reine öffentliche Origin ohne Pfad, Query oder Zugangsdaten sein.");
    }
    if (expectedHost && authUrl.hostname.toLowerCase() !== expectedHost) {
      errors.push("AUTH_URL stimmt nicht mit AUTH_EXPECTED_HOST überein.");
    }
  }

  const databaseUrl = parseUrl("DATABASE_URL", env.DATABASE_URL, errors);
  if (databaseUrl) {
    if (!["postgres:", "postgresql:"].includes(databaseUrl.protocol)) {
      errors.push("DATABASE_URL muss eine PostgreSQL-URL sein.");
    }
    if (!databaseUrl.hostname.includes("-pooler") && !containerSmoke) {
      errors.push("DATABASE_URL muss auf den gepoolten Neon-Endpunkt zeigen (Hostname mit -pooler).");
    }
    if (!containerSmoke && !["require", "verify-ca", "verify-full"].includes(databaseUrl.searchParams.get("sslmode") ?? "")) {
      errors.push("DATABASE_URL muss TLS über sslmode=require oder strenger erzwingen.");
    }
  }

  const redisUrl = parseUrl("REDIS_URL", env.REDIS_URL, errors);
  if (redisUrl && !["redis:", "rediss:"].includes(redisUrl.protocol)) {
    errors.push("REDIS_URL muss eine redis://- oder rediss://-URL sein.");
  }

  if (env.ERROR_REPORTING_ENDPOINT) {
    try {
      const reportingUrl = new URL(env.ERROR_REPORTING_ENDPOINT);
      if (reportingUrl.protocol !== "https:") {
        errors.push("ERROR_REPORTING_ENDPOINT muss HTTPS verwenden.");
      }
    } catch {
      errors.push("ERROR_REPORTING_ENDPOINT ist keine gültige URL.");
    }
  }
  if (env.ERROR_REPORTING_TOKEN && !env.ERROR_REPORTING_ENDPOINT) {
    errors.push("ERROR_REPORTING_TOKEN darf nur zusammen mit ERROR_REPORTING_ENDPOINT gesetzt sein.");
  }

  const discordIdPresent = Boolean(env.AUTH_DISCORD_ID);
  const discordSecretPresent = Boolean(env.AUTH_DISCORD_SECRET);
  if (discordIdPresent !== discordSecretPresent) {
    errors.push("AUTH_DISCORD_ID und AUTH_DISCORD_SECRET müssen beide oder gar nicht gesetzt sein.");
  }

  if (env.AUTH_TRUST_HOST !== "true" && env.AUTH_TRUST_HOST !== "false") {
    errors.push("AUTH_TRUST_HOST muss in Produktion explizit true oder false sein.");
  }
  if (env.AUTH_TRUST_HOST === "true") {
    const proxyCount = Number(env.TRUSTED_PROXY_COUNT);
    if (!Number.isInteger(proxyCount) || proxyCount < 1 || proxyCount > 5) {
      errors.push("Bei AUTH_TRUST_HOST=true muss TRUSTED_PROXY_COUNT die kontrollierten Proxy-Hops (1–5) angeben.");
    }
  }

  if (errors.length) {
    throw new Error(`Ungültige Produktionskonfiguration:\n- ${errors.join("\n- ")}`);
  }
}

export function authSecret(env: NodeJS.ProcessEnv = process.env) {
  validateProductionEnvironment(env);
  if (env.NODE_ENV === "production" && env.NEXT_PHASE !== "phase-production-build") return env.AUTH_SECRET!;
  return env.AUTH_SECRET ?? developmentAuthSecret;
}
