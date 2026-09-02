type LogLevel = "info" | "warn" | "error";

type ErrorDetails = {
  name: string;
  message: string;
  stack?: string;
  digest?: string;
};

type LogRecord = {
  timestamp: string;
  level: LogLevel;
  service: "unbindall";
  environment: string;
  event: string;
  release?: string;
  error?: ErrorDetails;
  context?: Record<string, unknown>;
};

const maximumMessageLength = 2_000;
const maximumStackLength = 12_000;

function truncate(value: string, maximumLength: number) {
  return value.length <= maximumLength ? value : `${value.slice(0, maximumLength)}…`;
}

export function errorDetails(error: unknown): ErrorDetails {
  if (error instanceof Error) {
    const digest = "digest" in error && typeof error.digest === "string" ? error.digest : undefined;
    return {
      name: error.name || "Error",
      message: truncate(error.message || "Unknown error", maximumMessageLength),
      ...(error.stack ? { stack: truncate(error.stack, maximumStackLength) } : {}),
      ...(digest ? { digest: truncate(digest, 256) } : {}),
    };
  }

  return {
    name: "NonErrorThrown",
    message: truncate(typeof error === "string" ? error : String(error), maximumMessageLength),
  };
}

export function pathWithoutQuery(path: string) {
  const queryIndex = path.search(/[?#]/);
  return truncate(queryIndex === -1 ? path : path.slice(0, queryIndex), 2_000);
}

function createRecord(
  level: LogLevel,
  event: string,
  context?: Record<string, unknown>,
  error?: unknown,
): LogRecord {
  const release = process.env.APP_VERSION ?? process.env.VERCEL_GIT_COMMIT_SHA;
  return {
    timestamp: new Date().toISOString(),
    level,
    service: "unbindall",
    environment: process.env.NODE_ENV ?? "unknown",
    event,
    ...(release ? { release } : {}),
    ...(error === undefined ? {} : { error: errorDetails(error) }),
    ...(context ? { context } : {}),
  };
}

function write(record: LogRecord) {
  const serialized = JSON.stringify(record);
  if (record.level === "error") console.error(serialized);
  else if (record.level === "warn") console.warn(serialized);
  else console.info(serialized);
}

async function deliver(record: LogRecord) {
  const endpoint = process.env.ERROR_REPORTING_ENDPOINT;
  if (!endpoint) return;

  try {
    const headers: Record<string, string> = { "content-type": "application/json" };
    if (process.env.ERROR_REPORTING_TOKEN) {
      headers.authorization = `Bearer ${process.env.ERROR_REPORTING_TOKEN}`;
    }
    const response = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(record),
      signal: AbortSignal.timeout(3_000),
    });
    if (!response.ok) {
      write(createRecord("warn", "error_reporting.delivery_failed", { status: response.status }));
    }
  } catch (error) {
    write(createRecord("warn", "error_reporting.delivery_failed", undefined, error));
  }
}

/** Logs immediately as one JSON line and forwards the same event when a collector is configured. */
export async function captureException(
  event: string,
  error: unknown,
  context?: Record<string, unknown>,
) {
  const record = createRecord("error", event, context, error);
  write(record);
  await deliver(record);
}
