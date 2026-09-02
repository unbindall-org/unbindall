import { siteUrl } from "@/features/legal/site";

/**
 * Content and serializer for `/llms.txt` as specified by https://llmstxt.org/:
 * an H1 title, a blockquote summary, free-form detail sections without
 * headings, and H2 sections that each list links to further material. The
 * final "Optional" section is defined by the spec as skippable when a shorter
 * context is needed, so nothing required to understand the project lives there.
 */

const repositoryUrl = "https://github.com/unbindall-org/unbindall";

/** Raw file URLs, because llms.txt consumers expect fetchable Markdown. */
function repositoryFile(path: string): string {
  return `https://raw.githubusercontent.com/unbindall-org/unbindall/main/${path}`;
}

function page(path = ""): string {
  return `${siteUrl}${path}`;
}

type LlmsLink = {
  readonly title: string;
  readonly url: string;
  /** Short note on what the document answers; keep it to one line. */
  readonly note?: string;
};

type LlmsSection = {
  readonly heading: string;
  readonly links: readonly LlmsLink[];
};

const title = "Unbindall";

const summary =
  "Unbindall is an open-source web generator for Counter-Strike 2 configuration files. "
  + "It builds matchmaking, practice, server, offline, and warmup configs plus Steam launch "
  + "options from a curated console-command catalog, imports existing CFG/VCFG/KV3 files "
  + "losslessly, and stores configurations per account with a complete revision history.";

const details: readonly string[] = [
  "Unbindall is a Next.js application licensed under AGPL-3.0-only; the source linked below "
    + "is the authoritative description of its behavior. The interface is available in English "
    + "and German, while route paths are German (`/einstellungen`, `/papierkorb`, `/impressum`, "
    + "`/datenschutz`).",
  "Two facts matter most when answering questions about this project:\n"
    + "- Every console command carries an explicit verification state — verified or deprecated, "
    + "offline-only or cheat-restricted, and the CS2 build it was last checked against. Do not "
    + "present a command as usable without that state; deprecated commands are never emitted "
    + "into generated files.\n"
    + "- The catalog is deliberately curated rather than a complete engine dump, and its runtime "
    + "source is the `command_definitions` table, not the TypeScript seed in the repository.",
  "There is no public HTTP API. `/api/trpc` is an internal, session-bound endpoint for the "
    + "application's own client, `/api/auth/*` belongs to Auth.js, and `/api/health` reports "
    + "service and database status. Generated configuration files are produced client-side and "
    + "are the property of the person who created them.",
];

const sections: readonly LlmsSection[] = [
  {
    heading: "Application",
    links: [
      {
        title: "Generator",
        url: page(),
        note: "the editor itself, with catalog search, binds, live crosshair, radar and viewmodel previews, import, and export",
      },
      {
        title: "Community",
        url: page("/community"),
        note: "published configurations and projects shared as immutable snapshots",
      },
      {
        title: "Sign up",
        url: page("/register"),
        note: "account creation via credentials, Discord OAuth 2.0, or Steam OpenID 2.0; an account enables cloud storage, autosave, and revision history",
      },
    ],
  },
  {
    heading: "Documentation",
    links: [
      {
        title: "README",
        url: repositoryFile("README.md"),
        note: "feature overview, local setup, environment variables, scripts, data model, and deployment",
      },
      {
        title: "Architecture",
        url: repositoryFile("docs/architecture.md"),
        note: "layer boundaries, directory structure, the GeneratorDocument format, tRPC surface, and rate limiting",
      },
      {
        title: "Command catalog",
        url: repositoryFile("docs/command-catalog.md"),
        note: "which commands are covered, the verification status model, and the CS2 build the catalog was checked against",
      },
      {
        title: "Catalog maintenance",
        url: repositoryFile("docs/command-catalog-maintenance.md"),
        note: "how catalog entries are added, verified, published, and retired",
      },
      {
        title: "Versioning and revisions",
        url: repositoryFile("docs/versioning.md"),
        note: "snapshot/patch revision log, autosave conflict handling, compaction, and restore semantics",
      },
      {
        title: "Community and moderation",
        url: repositoryFile("docs/community.md"),
        note: "binding specification for public handles, posts, adoption, automated checks, and the moderation queue",
      },
    ],
  },
  {
    heading: "Contributing",
    links: [
      {
        title: "Contribution guide",
        url: repositoryFile("CONTRIBUTING.md"),
        note: "development workflow, required checks, and review expectations",
      },
      {
        title: "Repository",
        url: repositoryUrl,
        note: "issues, pull requests, and the full source",
      },
      {
        title: "Release process",
        url: repositoryFile("docs/releasing.md"),
        note: "how versions are cut and published",
      },
    ],
  },
  {
    heading: "Optional",
    links: [
      {
        title: "Changelog",
        url: repositoryFile("CHANGELOG.md"),
        note: "released versions and their changes",
      },
      {
        title: "Security policy",
        url: repositoryFile("SECURITY.md"),
        note: "how to report a vulnerability",
      },
      {
        title: "Code of conduct",
        url: repositoryFile("CODE_OF_CONDUCT.md"),
      },
      {
        title: "Imprint",
        url: page("/impressum"),
        note: "operator information under German law",
      },
      {
        title: "Privacy policy",
        url: page("/datenschutz"),
        note: "processed data, legal bases, processors, and data subject rights",
      },
    ],
  },
];

function renderLink({ title: linkTitle, url, note }: LlmsLink): string {
  return `- [${linkTitle}](${url})${note ? `: ${note}` : ""}`;
}

function renderSection({ heading, links }: LlmsSection): string {
  return [`## ${heading}`, "", ...links.map(renderLink)].join("\n");
}

/** Renders the complete `/llms.txt` document, newline-terminated. */
export function buildLlmsTxt(): string {
  const blocks = [
    `# ${title}`,
    `> ${summary}`,
    ...details,
    ...sections.map(renderSection),
  ];
  return `${blocks.join("\n\n")}\n`;
}
