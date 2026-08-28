import { randomUUID } from "node:crypto";

const baseUrl = process.env.LOAD_BASE_URL ?? "http://127.0.0.1:3100";
const virtualUsers = Number(process.env.LOAD_VUS ?? 5);
const iterations = Number(process.env.LOAD_ITERATIONS ?? 5);
const p95LimitMs = Number(process.env.LOAD_P95_MS ?? 2_000);
const email = process.env.LOAD_EMAIL ?? `load-${Date.now()}@example.com`;
const password = process.env.LOAD_PASSWORD ?? "load-secret-123";
const timings = { login: [], autosave: [], export: [] };
const errors = [];

const document = {
  schemaVersion: 3,
  configType: "matchmaking",
  commandValues: {},
  standardBinds: [],
  multiBinds: [],
  customBinds: [],
  importedFiles: [],
};

function cookiesFrom(headers) {
  return headers.getSetCookie().map((value) => value.split(";", 1)[0]).join("; ");
}

function mergeCookies(current, headers) {
  const jar = new Map(current.split("; ").filter(Boolean).map((item) => item.split(/=(.*)/s).slice(0, 2)));
  for (const value of headers.getSetCookie()) {
    const [pair] = value.split(";", 1);
    const [name, cookieValue] = pair.split(/=(.*)/s).slice(0, 2);
    jar.set(name, cookieValue);
  }
  return [...jar].map(([name, value]) => `${name}=${value}`).join("; ");
}

async function trpc(path, input, cookie = "", method = "POST") {
  const query = method === "GET" && input !== undefined
    ? `?input=${encodeURIComponent(JSON.stringify(input))}`
    : "";
  const response = await fetch(`${baseUrl}/api/trpc/${path}${query}`, {
    method,
    headers: {
      ...(cookie ? { cookie } : {}),
      ...(method === "POST" ? { "content-type": "application/json" } : {}),
    },
    body: method === "POST" ? JSON.stringify(input) : undefined,
  });
  const payload = await response.json();
  if (!response.ok || payload.error) throw new Error(`${path}: HTTP ${response.status} ${JSON.stringify(payload.error ?? payload)}`);
  return payload.result.data;
}

async function ensureUser() {
  try {
    await trpc("auth.register", { name: "Load User", email, password });
  } catch (error) {
    if (!String(error).includes("CONFLICT")) throw error;
  }
}

async function login() {
  const started = performance.now();
  const csrfResponse = await fetch(`${baseUrl}/api/auth/csrf`);
  const { csrfToken } = await csrfResponse.json();
  let cookie = cookiesFrom(csrfResponse.headers);
  const response = await fetch(`${baseUrl}/api/auth/callback/credentials`, {
    method: "POST",
    redirect: "manual",
    headers: { cookie, "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ csrfToken, email, password, redirectTo: baseUrl }),
  });
  cookie = mergeCookies(cookie, response.headers);
  if (response.status >= 400 || !cookie.includes("authjs.session-token")) {
    throw new Error(`Login: HTTP ${response.status}`);
  }
  timings.login.push(performance.now() - started);
  return cookie;
}

async function exerciseUser(cookie, index) {
  const config = await trpc("config.create", {
    name: `Load ${index}-${randomUUID()}`,
    values: document,
    rawConfig: "",
    mutationId: randomUUID(),
  }, cookie);
  let revision = config.revision;
  for (let iteration = 0; iteration < iterations; iteration += 1) {
    const values = structuredClone(document);
    values.commandValues.sensitivity = index + iteration / 10;
    const started = performance.now();
    const saved = await trpc("config.autosave", {
      id: config.id,
      expectedRevision: revision,
      mutationId: randomUUID(),
      name: config.name,
      values,
      rawConfig: `sensitivity ${values.commandValues.sensitivity}`,
    }, cookie);
    timings.autosave.push(performance.now() - started);
    revision = saved.revision;
  }

  // Export is intentionally limited to five requests per account and hour.
  // One request per VU exercises concurrent serialization without turning the
  // load test into a rate-limit test.
  const exportStarted = performance.now();
  await trpc("account.export", undefined, cookie, "GET");
  timings.export.push(performance.now() - exportStarted);
}

function percentile(values, fraction) {
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * fraction) - 1)] ?? 0;
}

await ensureUser();
const sessions = await Promise.all(Array.from({ length: virtualUsers }, async () => {
  try {
    return await login();
  } catch (error) {
    errors.push(error);
    return null;
  }
}));
await Promise.all(sessions.map(async (cookie, index) => {
  if (!cookie) return;
  try {
    await exerciseUser(cookie, index);
  } catch (error) {
    errors.push(error);
  }
}));

for (const [name, values] of Object.entries(timings)) {
  const p95 = percentile(values, 0.95);
  console.log(`${name.padEnd(8)} requests=${String(values.length).padStart(3)} p95=${p95.toFixed(0)}ms`);
  if (p95 > p95LimitMs) errors.push(new Error(`${name} p95 ${p95.toFixed(0)}ms > ${p95LimitMs}ms`));
}
if (errors.length) {
  for (const error of errors) console.error(error);
  process.exitCode = 1;
} else {
  console.log(`Lasttest erfolgreich: ${virtualUsers} VUs, ${iterations} Iterationen.`);
}
