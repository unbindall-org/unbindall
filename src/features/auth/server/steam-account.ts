import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { accounts, users } from "@/db/schema";

type SteamPlayer = {
  steamid: string;
  personaname: string;
  avatarfull?: string;
};

export async function getSteamPlayer(steamId: string) {
  const apiKey = process.env.STEAM_WEB_API_KEY;
  if (!apiKey) throw new Error("STEAM_WEB_API_KEY ist nicht konfiguriert.");

  const url = new URL("https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/");
  url.searchParams.set("steamids", steamId);
  const response = await fetch(url, {
    headers: { "x-webapi-key": apiKey },
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error("Steam-Profil konnte nicht geladen werden.");

  const payload = await response.json() as { response?: { players?: SteamPlayer[] } };
  const player = payload.response?.players?.find((candidate) => candidate.steamid === steamId);
  if (!player) throw new Error("Steam-Profil wurde nicht gefunden.");
  return player;
}

export async function provisionSteamAccount(player: SteamPlayer) {
  return db.transaction(async (tx) => {
    const [existing] = await tx
      .select({ id: users.id, name: users.name, email: users.email, image: users.image, role: users.role })
      .from(accounts)
      .innerJoin(users, eq(accounts.userId, users.id))
      .where(and(eq(accounts.provider, "steam"), eq(accounts.providerAccountId, player.steamid)))
      .limit(1);

    if (existing) {
      const [updated] = await tx
        .update(users)
        .set({ name: player.personaname, image: player.avatarfull ?? null, updatedAt: new Date() })
        .where(eq(users.id, existing.id))
        .returning({ id: users.id, name: users.name, email: users.email, image: users.image, role: users.role });
      return updated;
    }

    const id = crypto.randomUUID();
    const [created] = await tx
      .insert(users)
      .values({ id, name: player.personaname, email: null, image: player.avatarfull ?? null })
      .returning({ id: users.id, name: users.name, email: users.email, image: users.image, role: users.role });
    await tx.insert(accounts).values({
      userId: id,
      type: "openid",
      provider: "steam",
      providerAccountId: player.steamid,
    });
    return created;
  });
}

export async function findSteamUser(steamId: string) {
  const [user] = await db
    .select({ id: users.id, name: users.name, email: users.email, image: users.image, role: users.role })
    .from(accounts)
    .innerJoin(users, eq(accounts.userId, users.id))
    .where(and(eq(accounts.provider, "steam"), eq(accounts.providerAccountId, steamId)))
    .limit(1);
  return user ?? null;
}
