import { describe, expect, it, vi } from "vitest";
import {
  createSteamAuthorizationUrl,
  createSteamLoginToken,
  steamCallbackUrl,
  steamOpenIdEndpoint,
  steamOpenIdNamespace,
  verifySteamLoginToken,
  verifySteamOpenId,
} from "./steam-openid";

const now = Date.parse("2026-08-28T12:00:00Z");
const steamId = "76561198000000000";
const state = "test-state";
const origin = "https://config.example";
const returnTo = steamCallbackUrl(origin, state);

function validOpenIdParams() {
  return new URLSearchParams({
    state,
    "openid.ns": steamOpenIdNamespace,
    "openid.mode": "id_res",
    "openid.op_endpoint": steamOpenIdEndpoint,
    "openid.claimed_id": `https://steamcommunity.com/openid/id/${steamId}`,
    "openid.identity": `https://steamcommunity.com/openid/id/${steamId}`,
    "openid.return_to": returnTo,
    "openid.response_nonce": "2026-08-28T12:00:00Znonce",
    "openid.assoc_handle": "123",
    "openid.signed": "signed,op_endpoint,claimed_id,identity,return_to,response_nonce,assoc_handle",
    "openid.sig": "signature",
  });
}

describe("Steam OpenID", () => {
  it("creates an OpenID 2.0 authorization request for the configured origin", () => {
    const url = createSteamAuthorizationUrl(origin, state);
    expect(url.origin + url.pathname).toBe(steamOpenIdEndpoint);
    expect(url.searchParams.get("openid.mode")).toBe("checkid_setup");
    expect(url.searchParams.get("openid.realm")).toBe(origin);
    expect(url.searchParams.get("openid.return_to")).toBe(returnTo);
  });

  it("accepts an assertion only after Steam validates it", async () => {
    const fetchMock = vi.fn(async (_input: string | URL | Request, init?: RequestInit) => {
      expect(init?.method).toBe("POST");
      expect((init?.body as URLSearchParams).get("openid.mode")).toBe("check_authentication");
      return new Response(`ns:${steamOpenIdNamespace}\nis_valid:true\n`);
    });

    await expect(verifySteamOpenId(validOpenIdParams(), returnTo, { fetch: fetchMock, now }))
      .resolves.toBe(steamId);
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("rejects changed callbacks and stale nonces before contacting Steam", async () => {
    const fetchMock = vi.fn();
    const changedCallback = validOpenIdParams();
    changedCallback.set("openid.return_to", `${origin}/attacker`);
    await expect(verifySteamOpenId(changedCallback, returnTo, { fetch: fetchMock, now })).resolves.toBeNull();

    const stale = validOpenIdParams();
    stale.set("openid.response_nonce", "2026-08-28T11:00:00Znonce");
    await expect(verifySteamOpenId(stale, returnTo, { fetch: fetchMock, now })).resolves.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("Steam login token", () => {
  it("accepts a fresh signed token", () => {
    const token = createSteamLoginToken(steamId, "secret", now);
    expect(verifySteamLoginToken(token, steamId, "secret", now + 30_000)).toBe(true);
  });

  it("rejects tampered, mismatched and expired tokens", () => {
    const token = createSteamLoginToken(steamId, "secret", now);
    expect(verifySteamLoginToken(`${token}x`, steamId, "secret", now)).toBe(false);
    expect(verifySteamLoginToken(token, "76561198000000001", "secret", now)).toBe(false);
    expect(verifySteamLoginToken(token, steamId, "secret", now + 121_000)).toBe(false);
  });
});
