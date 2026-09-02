import { z } from "zod";

export const reportTargetTypes = ["post", "comment", "user"] as const;
export const reportReasons = [
  "spam",
  "cheat_or_exploit",
  "harassment",
  "sexual_or_violent",
  "impersonation",
  "illegal",
  "other",
] as const;
export const reportStatuses = ["open", "in_review", "resolved", "rejected"] as const;

export type ReportTargetType = (typeof reportTargetTypes)[number];
export type ReportReason = (typeof reportReasons)[number];
export type ReportStatus = (typeof reportStatuses)[number];

export const reportNoteMaxLength = 1_000;
export const moderationReasonMaxLength = 500;

export const reportReasonLabels: Record<ReportReason, string> = {
  spam: "Spam oder Werbung",
  cheat_or_exploit: "Cheats oder Exploits",
  harassment: "Beleidigung oder Belästigung",
  sexual_or_violent: "Sexuelle oder gewaltverherrlichende Inhalte",
  impersonation: "Identitätsmissbrauch",
  illegal: "Rechtswidriger Inhalt",
  other: "Sonstiges",
};

export const moderationActionKinds = [
  "hide",
  "unhide",
  "remove",
  "restore",
  "dismiss_report",
  "edit_metadata",
  "warn",
  "mute",
  "publish_ban",
  "ban",
  "unban",
] as const;

export type ModerationActionKind = (typeof moderationActionKinds)[number];

export const moderationActionLabels: Record<ModerationActionKind, string> = {
  hide: "Ausgeblendet",
  unhide: "Wieder sichtbar",
  remove: "Entfernt",
  restore: "Wiederhergestellt",
  dismiss_report: "Meldung verworfen",
  edit_metadata: "Angaben bearbeitet",
  warn: "Verwarnt",
  mute: "Kommentieren gesperrt",
  publish_ban: "Veröffentlichen gesperrt",
  ban: "Account gesperrt",
  unban: "Sperre aufgehoben",
};

export const sanctionKinds = ["mute", "publish_ban", "ban"] as const;
export type SanctionKind = (typeof sanctionKinds)[number];

export const sanctionLabels: Record<SanctionKind, string> = {
  mute: "Kommentieren gesperrt",
  publish_ban: "Veröffentlichen gesperrt",
  ban: "Account gesperrt",
};

/** Which actions a moderator may apply to which kind of target. */
const actionsByTarget: Record<ReportTargetType, ModerationActionKind[]> = {
  post: ["hide", "unhide", "remove", "restore", "dismiss_report", "edit_metadata"],
  comment: ["hide", "unhide", "remove", "restore", "dismiss_report"],
  user: ["warn", "mute", "publish_ban", "ban", "unban", "dismiss_report"],
};

export function allowedActions(target: ReportTargetType) {
  return actionsByTarget[target];
}

export function isActionAllowed(target: ReportTargetType, action: ModerationActionKind) {
  return actionsByTarget[target].includes(action);
}

/** Actions that issue a sanction, and how long it lasts by default. */
export const sanctionForAction: Partial<Record<ModerationActionKind, SanctionKind>> = {
  mute: "mute",
  publish_ban: "publish_ban",
  ban: "ban",
};

export const reasonSchema = z.string().trim().min(5, "Eine Entscheidung braucht eine nachvollziehbare Begründung.").max(moderationReasonMaxLength);
export const noteSchema = z.string().trim().max(reportNoteMaxLength).optional();

export function isSanctionActive(
  sanction: { expiresAt: Date | null; revokedAt: Date | null },
  now = new Date(),
) {
  if (sanction.revokedAt) return false;
  return !sanction.expiresAt || sanction.expiresAt.getTime() > now.getTime();
}
