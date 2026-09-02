export type ClientErrorSource = "route-boundary" | "global-boundary" | "window.error" | "unhandled-rejection";

function text(value: unknown, fallback: string) {
  if (value instanceof Error) return value.message || fallback;
  return typeof value === "string" ? value : fallback;
}

export function captureClientException(error: unknown, source: ClientErrorSource) {
  try {
    const payload = JSON.stringify({
      source,
      message: text(error, "Unknown client error").slice(0, 2_000),
      stack: error instanceof Error ? error.stack?.slice(0, 8_000) : undefined,
      digest: error instanceof Error && "digest" in error && typeof error.digest === "string"
        ? error.digest.slice(0, 256)
        : undefined,
      path: window.location.pathname,
    });

    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/client-errors", new Blob([payload], { type: "application/json" }));
      return;
    }

    void fetch("/api/client-errors", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: payload,
      credentials: "same-origin",
      keepalive: true,
    });
  } catch {
    // Error reporting must never turn an application error into another user-facing failure.
  }
}
