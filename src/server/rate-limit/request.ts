import { isIP } from "node:net";

function validIp(value: string | null | undefined) {
  const candidate = value?.trim();
  return candidate && isIP(candidate) ? candidate : null;
}

/** Only proxy headers from an explicitly trusted proxy topology are consumed. */
export function clientIp(request?: Request) {
  if (!request) return "internal-call";
  if (process.env.AUTH_TRUST_HOST !== "true") return "direct-client";

  const trustedProxyCount = Number(process.env.TRUSTED_PROXY_COUNT);
  if (!Number.isInteger(trustedProxyCount) || trustedProxyCount < 1) return "unknown-client";

  const forwarded = request.headers.get("x-forwarded-for")
    ?.split(",")
    .map((entry) => entry.trim())
    .filter(Boolean) ?? [];
  const selected = forwarded[forwarded.length - trustedProxyCount];
  return validIp(selected) ?? validIp(request.headers.get("x-real-ip")) ?? "unknown-client";
}
