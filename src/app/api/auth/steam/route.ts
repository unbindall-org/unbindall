import { NextRequest, NextResponse } from "next/server";
import { createSteamAuthorizationUrl, createSteamState } from "@/features/auth/server/steam-openid";

export const runtime = "nodejs";

const stateCookie = "steam-openid-state";

function appOrigin(request: NextRequest) {
  return new URL(process.env.AUTH_URL ?? request.url).origin;
}

export async function GET(request: NextRequest) {
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
