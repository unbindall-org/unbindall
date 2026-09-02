import { z } from "zod";
import { generatorDocumentSchema } from "@/features/generator/domain/schema";
import { CONFIG_TYPES, type ConfigType } from "@/features/generator/domain/types";

export const communityPostKinds = ["config", "project"] as const;
export const communityVisibilities = ["public", "unlisted"] as const;
export const communityPostStatuses = ["draft", "published", "hidden", "removed"] as const;

export type CommunityPostKind = (typeof communityPostKinds)[number];
export type CommunityVisibility = (typeof communityVisibilities)[number];
export type CommunityPostStatus = (typeof communityPostStatuses)[number];

export const titleMaxLength = 80;
export const summaryMaxLength = 600;
export const changelogMaxLength = 300;
export const commentMaxLength = 2_000;
export const maxTags = 6;
export const maxTagLength = 24;
export const maxFilesPerPost = 6;
/** Per published version, before compression. Keeps one post from eating an account. */
export const maxVersionBytes = 512 * 1024;
export const publishedPostQuota = 30;

export const titleSchema = z.string().trim().min(3, "Ein Titel braucht mindestens 3 Zeichen.").max(titleMaxLength);
export const summarySchema = z.string().trim().min(10, "Beschreibe kurz, wofür die Config gedacht ist.").max(summaryMaxLength);

/**
 * Tags are an index, not free text: lowercase, deduplicated, capped. Anything
 * else turns the filter row into a second description field.
 */
export function normalizeTags(input: string[]): string[] {
  const seen = new Set<string>();
  for (const raw of input) {
    const tag = raw
      .trim()
      .toLowerCase()
      .replace(/^#+/, "")
      .replace(/[^a-z0-9äöüß+-]/g, "-")
      .replace(/-{2,}/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, maxTagLength);
    if (tag.length >= 2) seen.add(tag);
    if (seen.size >= maxTags) break;
  }
  return [...seen];
}

export const tagsSchema = z.array(z.string().max(60)).max(24).transform(normalizeTags);

export const publishedFileSchema = z.object({
  name: z.string().trim().min(1).max(60),
  configType: z.enum(CONFIG_TYPES),
  document: generatorDocumentSchema,
  rawConfig: z.string().max(100_000),
});

export type PublishedFileInput = z.infer<typeof publishedFileSchema>;

/**
 * The slug carries a short random suffix. Titles repeat — "Faceit Autoexec"
 * will exist a hundred times — and a publish must never fail on a name clash.
 */
export function slugifyTitle(title: string) {
  const base = title
    .trim()
    .toLowerCase()
    .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60)
    .replace(/-$/, "");
  return base || "config";
}

export function createSlug(title: string, suffix: string) {
  return `${slugifyTitle(title)}-${suffix.toLowerCase()}`.slice(0, 80);
}

export function randomSlugSuffix() {
  const alphabet = "abcdefghijkmnpqrstuvwxyz23456789";
  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(6));
  return [...bytes].map((byte) => alphabet[byte % alphabet.length]).join("");
}

export function configTypesOf(files: Array<{ configType: ConfigType }>): ConfigType[] {
  return [...new Set(files.map((file) => file.configType))];
}

export function measureFiles(files: PublishedFileInput[]) {
  return Buffer.byteLength(JSON.stringify(files), "utf8");
}

export const feedScopes = ["new", "trending", "top", "following"] as const;
export type FeedScope = (typeof feedScopes)[number];
