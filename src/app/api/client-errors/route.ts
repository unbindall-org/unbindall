import { NextResponse } from "next/server";
import { captureException, pathWithoutQuery } from "@/observability/server";
import {
  enforceRateLimits,
  RateLimitExceededError,
  requestRateLimit,
} from "@/server/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const maximumBodyLength = 12_000;
const allowedSources = new Set([
  "route-boundary",
  "global-boundary",
  "window.error",
  "unhandled-rejection",
]);

function allowedOrigins(request: Request) {
  const origins = new Set([new URL(request.url).origin]);
  try {
    if (process.env.AUTH_URL) origins.add(new URL(process.env.AUTH_URL).origin);
  } catch {
    // Production startup validation reports an invalid configured URL separately.
  }
  return origins;
}

export async function POST(request: Request) {
  const requestOrigin = request.headers.get("origin");
  if (!requestOrigin || !allowedOrigins(request).has(requestOrigin)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > maximumBodyLength) {
    return new NextResponse(null, { status: 413 });
  }

  try {
    await enforceRateLimits([requestRateLimit("clientErrorIp", request)]);
  } catch (error) {
    if (error instanceof RateLimitExceededError) {
      return new NextResponse(null, {
        status: 429,
        headers: { "retry-after": String(error.retryAfterSeconds) },
      });
    }
    return new NextResponse(null, { status: 503 });
  }

  const body = await request.text();
  if (body.length > maximumBodyLength) return new NextResponse(null, { status: 413 });

  try {
    const payload: unknown = JSON.parse(body);
    if (!payload || typeof payload !== "object") throw new Error("Invalid payload");
    const candidate = payload as Record<string, unknown>;
    if (typeof candidate.message !== "string" || !allowedSources.has(String(candidate.source))) {
      throw new Error("Invalid payload");
    }

    const error = new Error(candidate.message.slice(0, 2_000));
    if (typeof candidate.stack === "string") error.stack = candidate.stack.slice(0, 8_000);
    if (typeof candidate.digest === "string") Object.assign(error, { digest: candidate.digest.slice(0, 256) });

    await captureException("browser.unhandled_error", error, {
      source: candidate.source,
      path: pathWithoutQuery(typeof candidate.path === "string" ? candidate.path : "/"),
    });
    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
}
