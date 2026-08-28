import { handlers } from "@/auth";
import type { NextRequest } from "next/server";
import {
  enforceRateLimits,
  RateLimitExceededError,
  requestRateLimit,
} from "@/server/rate-limit";

async function limited(request: NextRequest, handler: (request: NextRequest) => Promise<Response>) {
  try {
    await enforceRateLimits([requestRateLimit("authEndpointIp", request)]);
  } catch (error) {
    if (error instanceof RateLimitExceededError) {
      return Response.json(
        { error: "TooManyRequests" },
        { status: 429, headers: { "retry-after": String(error.retryAfterSeconds) } },
      );
    }
    return Response.json({ error: "ServiceUnavailable" }, { status: 503 });
  }
  return handler(request);
}

export function GET(request: NextRequest) {
  return limited(request, handlers.GET);
}

export function POST(request: NextRequest) {
  return limited(request, handlers.POST);
}
