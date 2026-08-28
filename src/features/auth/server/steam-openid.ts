import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export const steamOpenIdEndpoint = "https://steamcommunity.com/openid/login";
export const steamOpenIdNamespace = "http://specs.openid.net/auth/2.0";
export const steamOpenIdIdentifier = `${steamOpenIdNamespace}/identifier_select`;

const steamIdentityPattern = /^https:\/\/steamcommunity\.com\/openid\/id\/(\d{17})$/;
const nonceTimestampPattern = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z)/;
const loginTokenLifetimeMs = 2 * 60 * 1000;
const openIdNonceLifetimeMs = 10 * 60 * 1000;

export function createSteamState() {
  return randomBytes(32).toString("base64url");
}

export function stateMatches(expected: string | undefined, received: string | null) {
  if (!expected || !received) return false;
  const expectedBuffer = Buffer.from(expected);
  const receivedBuffer = Buffer.from(received);
  return expectedBuffer.length === receivedBuffer.length && timingSafeEqual(expectedBuffer, receivedBuffer);
}

export function steamCallbackUrl(origin: string, state: string) {
  const callback = new URL("/api/auth/steam/callback", origin);
  callback.searchParams.set("state", state);
  return callback.toString();
}

export function createSteamAuthorizationUrl(origin: string, state: string) {
  const url = new URL(steamOpenIdEndpoint);
  const returnTo = steamCallbackUrl(origin, state);

  url.searchParams.set("openid.ns", steamOpenIdNamespace);
  url.searchParams.set("openid.mode", "checkid_setup");
  url.searchParams.set("openid.return_to", returnTo);
  url.searchParams.set("openid.realm", new URL(origin).origin);
  url.searchParams.set("openid.identity", steamOpenIdIdentifier);
  url.searchParams.set("openid.claimed_id", steamOpenIdIdentifier);
  return url;
}

function hasSingleOpenIdValue(params: URLSearchParams) {
  return [...new Set([...params.keys()].filter((key) => key.startsWith("openid.")))]
    .every((key) => params.getAll(key).length === 1);
}

function hasRequiredSignedFields(params: URLSearchParams) {
  const signed = new Set((params.get("openid.signed") ?? "").split(","));
  return ["claimed_id", "identity", "return_to", "response_nonce"].every((field) => signed.has(field));
}

function hasFreshNonce(nonce: string | null, now: number) {
  const timestamp = nonce?.match(nonceTimestampPattern)?.[1];
  if (!timestamp) return false;
  const nonceTime = Date.parse(timestamp);
  return Number.isFinite(nonceTime) && nonceTime <= now + 60_000 && nonceTime >= now - openIdNonceLifetimeMs;
}

export async function verifySteamOpenId(
  params: URLSearchParams,
  expectedReturnTo: string,
  options: { fetch?: typeof fetch; now?: number } = {},
) {
  const claimedId = params.get("openid.claimed_id");
  const identity = params.get("openid.identity");
  const match = claimedId?.match(steamIdentityPattern);

  if (
    !hasSingleOpenIdValue(params) ||
    params.get("openid.ns") !== steamOpenIdNamespace ||
    params.get("openid.mode") !== "id_res" ||
    params.get("openid.op_endpoint") !== steamOpenIdEndpoint ||
    params.get("openid.return_to") !== expectedReturnTo ||
    !match ||
    identity !== claimedId ||
    !hasRequiredSignedFields(params) ||
    !hasFreshNonce(params.get("openid.response_nonce"), options.now ?? Date.now())
  ) {
    return null;
  }

  const verification = new URLSearchParams();
  for (const [key, value] of params) {
    if (key.startsWith("openid.")) verification.append(key, value);
  }
  verification.set("openid.mode", "check_authentication");

  const response = await (options.fetch ?? fetch)(steamOpenIdEndpoint, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: verification,
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) return null;

  const values = new Map(
    (await response.text())
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const separator = line.indexOf(":");
        return separator === -1 ? [line, ""] : [line.slice(0, separator), line.slice(separator + 1)];
      }),
  );

  return values.get("is_valid") === "true" ? match[1] : null;
}

type SteamLoginToken = { steamId: string; issuedAt: number };

export function createSteamLoginToken(steamId: string, secret: string, now = Date.now()) {
  const payload = Buffer.from(JSON.stringify({ steamId, issuedAt: now } satisfies SteamLoginToken)).toString("base64url");
  const signature = createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function verifySteamLoginToken(token: string, steamId: string, secret: string, now = Date.now()) {
  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra) return false;

  const expected = createHmac("sha256", secret).update(payload).digest();
  const received = Buffer.from(signature, "base64url");
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) return false;

  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Partial<SteamLoginToken>;
    return parsed.steamId === steamId && typeof parsed.issuedAt === "number" &&
      parsed.issuedAt <= now + 5_000 && parsed.issuedAt >= now - loginTokenLifetimeMs;
  } catch {
    return false;
  }
}
