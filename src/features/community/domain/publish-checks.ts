import type { CommandDefinition } from "@/features/generator/catalog/commands";
import { validateCustomCommand } from "@/features/generator/domain/bindings";
import type { ConfigType, GeneratorDocument } from "@/features/generator/domain/types";

export type PublishFindingCode =
  | "cheat-command"
  | "offline-command"
  | "deprecated-command"
  | "unsafe-bind"
  | "links-in-text"
  | "duplicate-content";

export type PublishFindingSeverity = "block" | "flag";

export type PublishFinding = {
  code: PublishFindingCode;
  severity: PublishFindingSeverity;
  /** German source string, translated at the edge like every other message. */
  message: string;
  detail?: string;
};

export type PublishCheckResult = {
  status: "ok" | "flagged" | "blocked";
  findings: PublishFinding[];
};

/** Config types where cheat-protected commands are the whole point. */
const cheatFriendlyTypes = new Set<ConfigType>(["practice", "offline"]);
const offlineFriendlyTypes = new Set<ConfigType>(["practice", "offline", "warmup"]);

const urlPattern = /\b(?:https?:\/\/|www\.)\S+|\b[a-z0-9-]+\.(?:com|net|org|io|gg|de|ru|tv|xyz|shop)\b/gi;

function countLinks(text: string) {
  return (text.match(urlPattern) ?? []).length;
}

function enabledCommandNames(document: GeneratorDocument) {
  return Object.entries(document.commandValues)
    .filter(([key, value]) => key.startsWith("enabled:") && value === true)
    .map(([key]) => key.slice("enabled:".length));
}

/**
 * Configs are, unlike free text, machine-checkable. Everything decidable is
 * decided here so a moderator only ever sees what actually needs a person.
 *
 * A finding is a `block` when the content could not work as advertised or
 * bypasses a rule the generator itself enforces, and a `flag` when it merely
 * deserves a look.
 */
export function checkPublication(
  files: Array<{ name: string; configType: ConfigType; document: GeneratorDocument }>,
  text: { title: string; summary: string },
  catalog: CommandDefinition[],
): PublishCheckResult {
  const commands = new Map(catalog.map((command) => [command.name, command]));
  const findings: PublishFinding[] = [];

  for (const file of files) {
    for (const name of enabledCommandNames(file.document)) {
      const command = commands.get(name);
      if (!command) continue;

      if (command.status.restrictions.includes("requires-cheats") && !cheatFriendlyTypes.has(file.configType)) {
        findings.push({
          code: "cheat-command",
          severity: "block",
          message: "Diese Config aktiviert einen Command, der sv_cheats voraussetzt und im gewählten Config-Typ nicht funktioniert.",
          detail: `${file.name}: ${name}`,
        });
      } else if (command.status.restrictions.includes("offline-only") && !offlineFriendlyTypes.has(file.configType)) {
        findings.push({
          code: "offline-command",
          severity: "block",
          message: "Diese Config aktiviert einen reinen Offline-Command in einem Online-Config-Typ.",
          detail: `${file.name}: ${name}`,
        });
      }

      if (command.status.verification === "deprecated") {
        findings.push({
          code: "deprecated-command",
          severity: "flag",
          message: "Diese Config enthält einen veralteten Command.",
          detail: `${file.name}: ${name}`,
        });
      }
    }

    for (const bind of file.document.customBinds) {
      if (!bind.enabled) continue;
      const problem = validateCustomCommand(bind.command);
      if (problem) {
        findings.push({
          code: "unsafe-bind",
          severity: "block",
          message: "Ein Custom-Bind verstößt gegen die Bind-Regeln und darf nicht veröffentlicht werden.",
          detail: `${file.name}: ${bind.key} → ${problem}`,
        });
      }
    }
  }

  const links = countLinks(text.title) + countLinks(text.summary);
  if (links >= 3) {
    findings.push({
      code: "links-in-text",
      severity: "block",
      message: "Titel und Beschreibung enthalten zu viele Links.",
      detail: `${links} Links`,
    });
  } else if (links > 0) {
    findings.push({
      code: "links-in-text",
      severity: "flag",
      message: "Titel oder Beschreibung enthält einen Link.",
      detail: `${links} Link`,
    });
  }

  return summarize(findings);
}

export function summarize(findings: PublishFinding[]): PublishCheckResult {
  if (findings.some((finding) => finding.severity === "block")) return { status: "blocked", findings };
  return { status: findings.length ? "flagged" : "ok", findings };
}

export function duplicateFinding(otherSlug: string): PublishFinding {
  return {
    code: "duplicate-content",
    severity: "flag",
    message: "Ein identischer Inhalt wurde bereits von einem anderen Account veröffentlicht.",
    detail: otherSlug,
  };
}

export function describeFindings(findings: PublishFinding[]) {
  return findings
    .map((finding) => finding.detail ? `${finding.message} (${finding.detail})` : finding.message)
    .join(" ");
}
