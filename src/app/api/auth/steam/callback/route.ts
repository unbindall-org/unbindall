import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { signIn } from "@/auth";
import { getAuthSecret } from "@/features/auth/server/auth-secret";
import { getSteamPlayer, provisionSteamAccount } from "@/features/auth/server/steam-account";
import {
  createSteamLoginToken,
  stateMatches,
  steamCallbackUrl,
  verifySteamOpenId,
} from "@/features/auth/server/steam-openid";

export const runtime = "nodejs";

const stateCookie = "steam-openid-state";

function appOrigin(request: NextRequest) {
  return new URL(process.env.AUTH_URL ?? request.url).origin;
}

function errorRedirect(origin: string) {
  const url = new URL("/", origin);
  url.searchParams.set("authError", "steam");
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  const origin = appOrigin(request);
  const state = request.nextUrl.searchParams.get("state");
  const cookieStore = await cookies();
  const expectedState = cookieStore.get(stateCookie)?.value;
  cookieStore.delete(stateCookie);

  if (!stateMatches(expectedState, state)) return errorRedirect(origin);

  try {
    const expectedReturnTo = steamCallbackUrl(origin, state!);
    const steamId = await verifySteamOpenId(request.nextUrl.searchParams, expectedReturnTo);
    if (!steamId) return errorRedirect(origin);

    const player = await getSteamPlayer(steamId);
    await provisionSteamAccount(player);
    const loginToken = createSteamLoginToken(steamId, getAuthSecret());
    const redirectTo = await signIn("steam", {
      steamId,
      loginToken,
      redirect: false,
      redirectTo: "/",
    });

    return NextResponse.redirect(new URL(String(redirectTo), origin));
  } catch (error) {
    console.error("Steam sign-in failed", error);
    return errorRedirect(origin);
  }
}
