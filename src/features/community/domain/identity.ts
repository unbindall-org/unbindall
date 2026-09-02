import { z } from "zod";

/**
 * The public community identity. It is deliberately not the Auth.js `name`:
 * that value comes from Discord, Steam or the registration form, is not unique,
 * may contain a real name and cannot be changed by the account holder.
 */
export const handlePattern = /^[a-z][a-z0-9_-]{2,23}$/;

export const handleMinLength = 3;
export const handleMaxLength = 24;
export const displayNameMaxLength = 40;

/** Paths and roles that must never be claimable as an identity. */
const reservedHandles = new Set([
  "admin", "administrator", "moderator", "moderation", "mod", "team", "staff",
  "support", "help", "unbindall", "official", "system", "root", "api", "u",
  "community", "settings", "einstellungen", "papierkorb", "register", "login",
  "logout", "signin", "signup", "account", "profile", "profil", "configs",
  "config", "impressum", "datenschutz", "legal", "about", "null", "undefined",
]);

export function normalizeHandle(value: string) {
  return value.trim().toLowerCase();
}

export function isReservedHandle(value: string) {
  return reservedHandles.has(normalizeHandle(value));
}

export const handleSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(handlePattern, "Ein Handle besteht aus 3 bis 24 Zeichen: Kleinbuchstaben, Ziffern, - und _, beginnend mit einem Buchstaben.")
  .refine((value) => !isReservedHandle(value), "Dieser Handle ist reserviert.");

export const displayNameSchema = z
  .string()
  .trim()
  .min(1, "Ein Anzeigename darf nicht leer sein.")
  .max(displayNameMaxLength, `Ein Anzeigename darf höchstens ${displayNameMaxLength} Zeichen haben.`);

/**
 * A handle may change, but not freely: an identity that carries reputation and
 * moderation history must not be swappable from one day to the next.
 */
export const handleChangeCooldownDays = 30;

export function handleChangeAvailableAt(lastChange: Date | null) {
  if (!lastChange) return null;
  return new Date(lastChange.getTime() + handleChangeCooldownDays * 24 * 60 * 60 * 1_000);
}

export function canChangeHandle(lastChange: Date | null, now = new Date()) {
  const available = handleChangeAvailableAt(lastChange);
  return !available || available.getTime() <= now.getTime();
}

export type PublicAuthor = {
  handle: string;
  displayName: string;
  image: string | null;
};

/** Never widen this: an author is a handle, a name and an avatar. Nothing else. */
export function toPublicAuthor(row: {
  handle: string | null;
  displayName: string | null;
  name: string | null;
  image: string | null;
}): PublicAuthor {
  return {
    handle: row.handle ?? "geloescht",
    displayName: row.displayName ?? row.handle ?? "Gelöschter Account",
    image: row.image ?? null,
  };
}

export function initialsFor(author: Pick<PublicAuthor, "displayName" | "handle">) {
  const source = author.displayName.trim() || author.handle;
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return source.slice(0, 2).toUpperCase();
}
