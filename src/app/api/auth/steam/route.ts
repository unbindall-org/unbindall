import { NextRequest, NextResponse } from "next/server";
import { createSteamAuthorizationUrl, createSteamState } from "@/features/auth/server/steam-openid";
import { enforceRateLimits, RateLimitExceededError, requestRateLimit } from "@/server/rate-limit";

export const runtime = "nodejs";

const stateCookie = "steam-openid-state";

function appOrigin(request: NextRequest) {
  return new URL(process.env.AUTH_URL ?? request.url).origin;
}

export async function GET(request: NextRequest) {
  try {
    await enforceRateLimits([requestRateLimit("steamStartIp", request)]);
  } catch (error) {
    const retryAfter = error instanceof RateLimitExceededError ? error.retryAfterSeconds : 30;
    return NextResponse.json(
      { error: error instanceof RateLimitExceededError ? error.message : "Rate-Limiting nicht verfügbar." },
      { status: error instanceof RateLimitExceededError ? 429 : 503, headers: { "retry-after": String(retryAfter) } },
    );
  }

  if (!process.env.STEAM_WEB_API_KEY) {
    return NextResponse.json({ error: "Steam-Login ist nicht konfiguriert." }, { status: 503 });
  }

  const origin = appOrigin(request);
  const state = createSteamState();
  const response = NextResponse.redirect(createSteamAuthorizationUrl(origin, state));
  response.cookies.set(stateCookie, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: origin.startsWith("https://"),
    path: "/",
    maxAge: 10 * 60,
  });
  return response;
}
