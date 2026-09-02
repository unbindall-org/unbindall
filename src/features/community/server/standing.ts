import "server-only";

import { TRPCError } from "@trpc/server";
import { and, eq, isNull, or, gt } from "drizzle-orm";
import { db } from "@/db";
import { users, userSanctions } from "@/db/schema";
import type { SanctionKind } from "../domain/moderation";

export type CommunityStanding = {
  userId: string;
  handle: string | null;
  displayName: string | null;
  name: string | null;
  image: string | null;
  sanctions: SanctionKind[];
};

/**
 * Loaded once per mutation. A sanction has to bite on the next request, not
 * when a cached session happens to expire.
 */
export async function loadStanding(userId: string): Promise<CommunityStanding> {
  const [account] = await db
    .select({
      id: users.id,
      handle: users.handle,
      displayName: users.displayName,
      name: users.name,
      image: users.image,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!account) throw new TRPCError({ code: "NOT_FOUND", message: "Account nicht gefunden." });

  const active = await db
    .select({ kind: userSanctions.kind })
    .from(userSanctions)
    .where(and(
      eq(userSanctions.userId, userId),
      isNull(userSanctions.revokedAt),
      or(isNull(userSanctions.expiresAt), gt(userSanctions.expiresAt, new Date())),
    ));

  return {
    userId: account.id,
    handle: account.handle,
    displayName: account.displayName,
    name: account.name,
    image: account.image,
    sanctions: active.map((row) => row.kind),
  };
}

export type CommunityCapability = "publish" | "comment" | "interact";

const blockedBy: Record<CommunityCapability, SanctionKind[]> = {
  publish: ["ban", "publish_ban"],
  comment: ["ban", "mute"],
  interact: ["ban"],
};

const sanctionMessages: Record<SanctionKind, string> = {
  ban: "Dein Account ist für die Community gesperrt.",
  publish_ban: "Du darfst derzeit nichts veröffentlichen.",
  mute: "Du darfst derzeit nicht kommentieren.",
};

export function assertCapability(standing: CommunityStanding, capability: CommunityCapability) {
  const hit = standing.sanctions.find((sanction) => blockedBy[capability].includes(sanction));
  if (hit) throw new TRPCError({ code: "FORBIDDEN", message: sanctionMessages[hit] });
}

/**
 * Publishing and commenting attach a name to content forever, so both require a
 * chosen identity. Liking and adopting do not.
 */
export function requireHandle(standing: CommunityStanding) {
  if (!standing.handle) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Lege zuerst einen öffentlichen Handle fest.",
    });
  }
  return standing.handle;
}
