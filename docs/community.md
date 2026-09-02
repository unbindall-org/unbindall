# Community and Moderation

This document is the binding specification for the community area. The current implementation in `src/features/community/` and `src/features/platform/components/moderation-page.tsx` is a non-persistent mockup; everything described here supersedes it.

## Core decisions

**A post is an immutable snapshot, not a live link to a workspace configuration.** Authors can continue editing their configuration without changing content already adopted by others. Moderation therefore evaluates fixed content, adoptions are reproducible, and deleting a personal configuration does not break other people's downloads.

**Both configurations and complete projects can be shared.** A project is what players actually exchange: autoexec, practice, server, and warmup configurations as one coherent setup.

**Public identity is separate from sign-in identity.** `users.name` comes from Discord, Steam, or registration, is not unique, and may contain a legal name. Community content therefore uses a separate unique handle and a freely editable display name.

**Moderation happens after publication, with automated checks before publication.** Unlike free text, configurations can be checked deterministically. Cheat commands, `exec` chains, and global bind manipulation are detected before publication and either blocked or reported automatically. This keeps the human review queue small.

## Identity

`users` gains two fields:

- `handle` — unique, lowercase, 3–24 characters from `[a-z0-9_-]`, and not starting with a digit. Reserved values include `admin`, `moderator`, `team`, `support`, `unbindall`, `api`, `u`, `community`, `moderation`, and `settings`. The handle is requested on first publication or comment, not during registration.
- `displayName` — 1–40 characters, freely editable, and not unique.

A handle may be changed at most once every 30 days. The previous handle remains reserved for 30 days so another person cannot immediately assume that identity. `users.email` never leaves the server context of a public procedure.

Profile route: `/u/[handle]`.

## Data model

### community_posts

| Column | Type | Notes |
| --- | --- | --- |
| `id` | text primary key | |
| `author_id` | text → users.id, cascade | Account deletion removes posts |
| `kind` | text | `config` or `project` |
| `slug` | unique text | Derived from title plus short ID |
| `title` | text | Maximum 80 characters |
| `summary` | text | Maximum 600 characters, plain text |
| `tags` | text[] | Maximum 6, normalized to lowercase |
| `config_types` | text[] | Denormalized from the version for filtering |
| `visibility` | text | `public` or `unlisted` |
| `status` | text | `draft`, `published`, `hidden`, or `removed` |
| `current_version` | integer | |
| `like_count`, `adopt_count`, `comment_count` | integer | Denormalized counters |
| `published_at`, `created_at`, `updated_at`, `deleted_at` | timestamptz | |

Indexes: `unique(slug)`, `(status, visibility, published_at desc)`, `(author_id, updated_at)`, GIN on `tags`, and GIN on a full-text `tsvector` column covering title, summary, and tags.

The mockup's third “Private” visibility is not a visibility level; it means “not published.” It is removed as a separate value.

### community_post_versions

`id`, `post_id` (cascade), integer `version`, text `changelog`, text `content_hash`, `created_at`, and `files` as JSONB:

```ts
type PublishedFile = {
  name: string;
  configType: ConfigType;
  document: GeneratorDocument; // validated with generatorDocumentSchema
  rawConfig: string;
};
```

A `config` post contains exactly one file; a `project` post contains at most six. A unique constraint covers `(post_id, version)`. Versions are never modified or deleted while their post exists.

Title, summary, and tags can be edited directly on the post. A content change always creates a new version with a changelog. A new version does not clear `hidden` status.

### community_comments

`id`, `post_id` (cascade), `author_id` (cascade), `parent_id` (self-reference with exactly one reply level), text `body` with a 2,000-character maximum, `status` (`visible`, `hidden`, or `removed`), `created_at`, `updated_at`, and `edited_at`. Indexes cover `(post_id, created_at)` and `(author_id, created_at)`.

Comments render only plain text with line breaks: no images, Markdown, or automatic links. This removes much of the incentive for spam and the surface for XSS. Authors may edit for 15 minutes; author deletion sets `status = 'removed'` and clears the text.

### community_reactions and community_follows

`community_reactions`: primary key `(post_id, user_id)`, `kind` (initially only `like`), and `created_at`.

`community_follows`: primary key `(follower_id, followee_id)`, `created_at`, and a check preventing self-following. Counters on `community_posts` are updated in the same transaction.

### content_reports

`id`, `target_type` (`post`, `comment`, or `user`), `target_id`, `target_author_id`, nullable `reporter_id`, `source` (`user` or `system`), `reason`, `note` (maximum 1,000 characters), `status` (`open`, `in_review`, `resolved`, or `rejected`), nullable `assigned_to`, `resolution_action`, `resolved_at`, and `created_at`.

Reasons: `spam`, `cheat_or_exploit`, `harassment`, `sexual_or_violent`, `impersonation`, `illegal`, and `other`. A partial unique index on `(reporter_id, target_type, target_id)` for open and in-review reports prevents report spam. Another index covers `(status, created_at)`.

### moderation_actions

Append-only, with no update or delete path in application code: `id`, `moderator_id`, `action`, `target_type`, `target_id`, nullable `report_id`, required `reason`, `note`, and `created_at`.

Actions: `hide`, `unhide`, `remove`, `restore`, `dismiss_report`, `edit_metadata`, `warn`, `mute`, `publish_ban`, `ban`, and `unban`. This log makes moderation decisions traceable and appears with the relevant post, comment, and author.

### user_sanctions

`id`, `user_id`, `kind` (`mute`, `publish_ban`, or `ban`), `reason`, `issued_by`, nullable `expires_at` for indefinite sanctions, `revoked_at`, and `created_at`.

## Server

Two new routers in `src/trpc/routers/`:

`communityRouter`

- `feed` (public) — `scope`: `new`, `trending`, or `following`; configuration-type and tag filters, full-text search, and cursor pagination
- `bySlug` (public) — post with current version and author profile
- `versions`, `version` (public)
- `publish`, `updateMetadata`, `publishVersion`, `unpublish` (protected)
- `like`, `unlike`, `follow`, `unfollow`, `recordAdoption` (protected)
- `comments`, `addComment`, `editComment`, `deleteComment`
- `profile` (public), `myPosts` (protected)
- `report` (protected)

`moderationRouter` — entirely under `moderatorProcedure` from `src/trpc/init.ts`

- `queue`, `stats`, `report`, `assign`
- `act` — performs an action, always writes `moderation_actions`, and closes the report in the same transaction
- `history` — filterable audit log
- `userStanding` — account age, post count, previous actions, and active sanctions

Public reads use tagged caches based on the command catalog pattern; writes invalidate them immediately.

A `communityStandingProcedure` middleware loads active sanctions and blocks publication or commenting before a mutation takes effect.

### Automated pre-publication checks

`src/features/community/domain/publish-checks.ts` returns `{ status: "ok" | "flagged" | "blocked", findings }`:

- commands with cheat or development `restrictions` → blocked, naming the affected commands
- custom binds containing `exec`, `bind`, `unbindall`, `alias`, `host_writeconfig`, or `con_logfile` → blocked
- URLs in title or summary → flagged at one, blocked at three
- `content_hash` identical to another author's published post → flagged as a possible reupload

`flagged` publishes the post and simultaneously creates a `source = 'system'` report in the queue.

### Rate limits and quotas

New policies in `src/server/rate-limit/policies.ts`:

```ts
communityPublishAccount:  { limit: 10,  windowMs: 60 * 60_000 }
communityPublishIp:       { limit: 20,  windowMs: 60 * 60_000 }
communityCommentAccount:  { limit: 30,  windowMs: 15 * 60_000 }
communityCommentIp:       { limit: 60,  windowMs: 15 * 60_000 }
communityReactionAccount: { limit: 120, windowMs: 60_000 }
communityReportAccount:   { limit: 20,  windowMs: 60 * 60_000 }
communityReadIp:          { limit: 300, windowMs: 60_000 }
handleChangeAccount:      { limit: 1,   windowMs: 30 * 24 * 60 * 60_000 }
```

Quotas: 30 published posts per account, 6 files per project post, 512 KiB per version, and 2,000 characters per comment. Community content is counted separately from the existing workspace quota.

## Adoption

This is the feature's core and the reason Unbindall is more than a pastebin.

Full adoption creates a new configuration or project in the workspace and respects existing account quotas. Signed-out visitors adopt into their local workspace or download the CFG directly.

Partial adoption uses the `GeneratorDocument` structure. Selection follows the existing module registry so the adoption dialog shows the same areas as the generator:

```ts
// src/features/community/domain/adopt.ts
type AdoptSelection = {
  commandCategories: string[];
  standardBinds: boolean;
  multiBinds: boolean;
  customBinds: boolean;
  importedFiles: boolean;
};

function mergeDocument(
  target: GeneratorDocument,
  source: GeneratorDocument,
  selection: AdoptSelection,
): { document: GeneratorDocument; conflicts: AdoptConflict[] };
```

Conflicts—the same key with a different action or the same command with a different value—are listed instead of silently resolved. The user chooses “Adopt” or “Keep” for each conflict. The function is pure and ships with the tests required by `CONTRIBUTING.md`.

`recordAdoption` counts idempotently per user and version.

## UI

| Route | Tab kind | Content |
| --- | --- | --- |
| `/community` | `community` | Feed with New, Trending, and Following |
| `/community/[slug]` | `community-detail` | Preview, adoption, comments, reporting, and versions |
| `/community/new` | `community-post` | Composer connected to `publish` |
| `/u/[handle]` | `profile` | Profile, posts, and follows |
| `/moderation` | `moderation` | Queue, detail, and history |
| `/einstellungen` | `settings` | Handle, display name, and public profile |

Add dynamic tab kinds in the same way as `config` in `src/features/workspace/domain/workspace.ts` (`normalizeTabs`) and `routes.ts` (`pathForTab`, `tabForPath`).

Trending ranking runs in SQL without a background job:

```text
score = (like_count + 2 * adopt_count + 1.5 * comment_count) / pow(hours_since_publication + 2, 1.5)
```

Every new string needs an `en` entry in `src/i18n/resources.ts`; the German string remains the key.

## Implementation order

1. **Foundation** — migration, handle and display-name settings, `publish`, `feed`, `bySlug`, real data for feed and detail pages, and full configuration/project adoption.
2. **Moderation** — reporting, queue, actions, audit log, sanctions, and automated pre-publication checks.
3. **Interaction** — likes, comments, profiles, follows, personalized feed, and trending.
4. **Partial adoption** — merge domain, conflict dialog, and post versions with changelog.

Moderation deliberately precedes interaction. As soon as third-party content is publicly visible, there must be a way to remove it. Comments arrive only after the queue required to handle them exists.

## Verification

- Unit: `mergeDocument`, `publish-checks`, slug and handle validation, ranking
- Integration: publication, feed, adoption, reporting, and moderation as one end-to-end server flow; role and ownership checks; account-deletion cascade; sanction enforcement; report deduplication
- E2E: publish, discover, adopt, and report

## Legal note

The service is operated from Germany and will host user-generated content after this extension. The moderation system described here covers reporting channels, processing, and traceability. Formal Digital Services Act requirements—acknowledgment of receipt, reasoned decisions sent to reporters and authors, an appeal path, and transparency disclosures—are intentionally outside this phase and must be assessed separately before a public launch.
