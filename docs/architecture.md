# Architecture

Unbindall is a Next.js application with three distinct layers: web/API, generator domain, and infrastructure. Application-specific client/server communication is fully typed through tRPC and TanStack Query; the project does not use Server Actions.

## Directory structure

```text
src/
├── app/                         Next.js pages, auth handlers, and tRPC handlers
├── db/                          Drizzle connection and PostgreSQL schema
├── features/
│   ├── auth/components/         authentication UI
│   ├── auth/server/             Steam OpenID, provider accounts, and auth secrets
│   └── generator/
│       ├── catalog/             curated CS2 commands and binding actions
│       ├── components/          generator and module UI
│       ├── domain/              document, validation, import, and export
│       └── modules/             registry of visible generator modules
├── trpc/                        context, routers, procedures, and query provider
└── types/                       external TypeScript augmentations
```

## GeneratorDocument

`GeneratorDocument` is the only persisted generator format. It contains:

- `schemaVersion`
- `configType` (`matchmaking`, `practice`, `server`, `offline`, `warmup`, or `launch-options`)
- console-command values and enabled states
- standard binds
- double/multi-binds
- custom binds
- up to ten losslessly retained CFG, VCFG, or KV3 import sources

Local Storage, IndexedDB, Neon, and imported configurations are normalized through `normalizeDocument` when read. Older flat drafts and documents without a type are automatically migrated to the versioned format as matchmaking configurations.

Cloud configurations use a complete current head and an append-only revision log made of hybrid snapshots and patches. Autosaves optimistically check the expected revision and are queued idempotently in IndexedDB while offline. See [versioning.md](versioning.md) for details and restore semantics.

Classic CFG files retain their exact text and file order on import. The serializer appends editable generator values as overrides. Textual CS2 VCFG/KV1 and KV3 files are translated into executable ConVar and bind lines; their complete original source is also retained as a comment block in the export and document.

## Modules

The module registry controls navigation, search, and rendering. Settings sections use the shared command catalog. Bind modules may own structured data, but must produce final output through `resolveBindings` and `serializeConfig`. Conflict checks, escaping, and deduplication therefore apply consistently.

A double bind in Unbindall means that multiple keys execute the same single action. A key that automates multiple movement or attack actions is intentionally outside the generator's scope.

## Data flow

```text
UI module → GeneratorDocument → type filter → validation → serializer → *.cfg / launch options
                         └────→ IndexedDB → TanStack Query → tRPC → Auth.js → Drizzle → Neon JSONB
```

## Security boundaries

- Protected tRPC procedures derive the user ID only from the server-side Auth.js session.
- Updates and deletes always filter by both configuration ID and user ID.
- Revisions are written atomically with the current head; stale clients receive a conflict instead of silently overwriting newer data.
- Custom binds allow one action and block commands that load other configurations or globally change bindings.
- Credential passwords are hashed with bcrypt.
- Discord uses the Auth.js OAuth provider; only email addresses verified by Discord are eligible for explicit account linking.
- Steam assertions are checked with a state cookie, callback binding, nonce freshness, and direct OpenID verification with Steam. A short-lived HMAC token then passes the confirmed Steam ID internally to Auth.js.
- Secrets remain exclusively in the runtime environment.
