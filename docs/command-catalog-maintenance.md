# Maintaining and Extending the Command Catalog

This guide defines how commands are discovered, verified, published, and reassessed after CS2 updates. The goal is a comprehensive but curated catalog for normal competitive configurations, competitive servers, and local practice configurations. A complete engine dump is an input, not the product scope.

## Principle: existence is not verification

A command can appear in a dump but still be ineffective in the relevant context, available on only one platform, or restricted by flags. Answer these four questions separately:

1. Does the name exist in a specific build and on a specific platform?
2. Is the command registered in the relevant runtime context?
3. Can it be executed and read back with the documented syntax?
4. Does it produce the described effect?

Only the final level justifies a long-term public “Verified” badge. The existing catalog baseline mostly proves presence in a dump. Existing entries should progressively move through this process to stronger evidence levels.

## Evidence levels

| Level | Meaning | Required evidence |
| --- | --- | --- |
| E0 — Candidate | Found in patch notes, a configuration, a forum, or search results | Link or location; not approved for the catalog |
| E1 — Build-confirmed | Present in a build- and platform-specific ConVar/command extract | Build ID, platform, source, and preferably a commit or artifact hash |
| E2 — Runtime-confirmed | Registered in the correct local context | Output from `help`, `find`, or `cvarlist`; identify client, listen server, or dedicated server |
| E3 — Syntax-confirmed | Setting and readback work; type, default, range, and flags are checked | Reproducible console test and result; console output for action commands |
| E4 — Behavior-confirmed | The described effect was observed in game or server state | Short test with expectation, result, map/mode, and reset step |

Publication rules:

- New public commands require E4. Until then, keep them outside the catalog or as candidates in a maintenance pull request.
- Label or description changes may use E3 when they do not change a behavior claim.
- Presets and `enabledByDefault` may contain only E4 commands.
- Server and practice commands must reach E4 in their respective context; a client-only test is insufficient.
- `offline-only` and `requires-cheats` are restrictions, not evidence levels.
- Set `deprecated` only after absence or a replacement is confirmed. One missing dump result is insufficient.

## Sources and their roles

No single source answers all four questions:

- [Valve patch notes](https://store.steampowered.com/news/app/730) and the [Valve Developer Community](https://developer.valvesoftware.com/wiki/Counter-Strike_2) document intended changes but are incomplete.
- [CS2OpenDev SchemaTracker](https://github.com/CS2OpenDev/CS2OpenDev-SchemaTracker) generates deterministic, build- and platform-specific `convars.json`, `commands.json`, and `provenance.json` directly from shipped runtime binaries. It is the preferred E1 source.
- [SteamTracking/GameTracking-CS2](https://github.com/SteamTracking/GameTracking-CS2/tree/master/DumpSource2) tracks current text dumps and shipped game files. It is useful for diffs and as a second E1 source.
- The [Poggu ConVar dump](https://cs2.poggu.me/dumped-data/convar-list/) is searchable and useful for cross-checking. Its [method documentation](https://cs2.poggu.me/reverse-engineering/ConVars/) explains that data is extracted from internal ConVar structures.
- SteamDB helps place a public build ID in time. The build ID in the local Steam manifest controls local verification.
- Community configurations, videos, wikis, and search results provide E0 candidates but can never establish “Verified” by themselves.

When sources conflict, a reproducible runtime test for the exact documented build, platform, and context takes precedence. Record the conflict in the verification log anyway.

## Staged maintenance process

### Stage 1: detect the update and pin the baseline

For every public CS2 update:

1. Record the public and local build IDs.
2. Fix the date, platforms, and available test contexts.
3. Pin every dump to a commit or immutable artifact.
4. Export the currently published database snapshot without changing `checkedVersion` yet.

Update a global version string only after all affected commands are checked. Per-command `checkedVersion` remains the more precise statement.

### Stage 2: generate a machine diff

Compare the old and new E1 datasets for:

- added and removed names
- changes between ConVar and action command
- type, default, minimum, and maximum
- flags such as `cheat`, `developmentonly`, `hidden`, `replicated`, `clientdll`, and `gamedll`
- changed help text

Prioritize commands already in the catalog, in a preset, or enabled by default. A new engine entry becomes a candidate only when it fits one of the three product contexts.

### Stage 3: curate candidates

A command belongs in the catalog when it solves a typical configuration task, is persistently configurable or usefully automatable, and can be explained to normal players. Exclude pure developer diagnostics, internal UI actions, dangerous admin commands, duplicates without distinct value, and commands included only because they appeared in a dump.

Define the following before testing each candidate:

- target context: `client`, `competitive-server`, or `practice`
- expected type and allowed values
- expected restrictions
- concrete E4 test and reset step

### Stage 4: verify locally in CS2

Local testing is optional for candidate discovery but mandatory for E2 through E4. It can run on a normal client, local listen server, or isolated dedicated server.

Recommended test matrix:

| Catalog area | Minimum context | Additional context |
| --- | --- | --- |
| Normal configuration | Client on a local map | Second supported operating system for platform-sensitive commands |
| Server configuration | Local dedicated server | Listen server to detect registration differences |
| Practice | Local map/listen server | Dedicated server when the command is available there |

Run cheat-protected tests only in a local or private session. Never expose `sv_cheats 1`, `-insecure`, RCON, or netconsole access on a publicly reachable test server. Passwords and tokens must not appear in console dumps or pull requests.

### Stage 5: change the catalog and tests

After a successful E4 test:

1. Add or correct the entry as an unpublished draft in the platform admin area, including English and German text, type, default, range, configuration contexts, and restrictions.
2. Expose useful UI limits; engine minimum and maximum values do not automatically make good control limits.
3. Model action commands without artificial arguments.
4. Test serializer, import, and status cases.
5. Test presets separately in their intended context.
6. Update `checkedVersion` and publish only after review.
7. For reproducible new installations, update the TypeScript seed and add a follow-up migration with the same verified state. Generate SQL seed data deterministically with `scripts/generate-command-catalog-seed.ts`.

Run the normal project checks:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

### Stage 6: review, publish, and observe

Review the command name, evidence, context, restrictions, description, and anti-bloat criterion. Associate post-publication bug reports with the affected build. When uncertain, first remove a command from presets and default activation; use `deprecated` only after confirmed removal or replacement.

## Inspecting a local CS2 installation

CI and container environments often do not contain CS2. Reliable verification ends at E1 there: candidates and diffs can be prepared, but no new command can be published as “Verified.” Perform E2 through E4 on a separate machine with Steam and local CS2 files.

### 1. Locate the installation and build

The most reliable route is **Steam → Library → Counter-Strike 2 → Properties → Installed Files → Browse**. The selected Steam library also contains:

```text
<STEAM_LIBRARY>/steamapps/appmanifest_730.acf
<STEAM_LIBRARY>/steamapps/common/Counter-Strike Global Offensive/
```

Read the build ID and installation name from the manifest without modifying it:

```bash
rg -n '"(buildid|installdir)"' '<STEAM_LIBRARY>/steamapps/appmanifest_730.acf'
```

PowerShell:

```powershell
Select-String -Path '<STEAM_LIBRARY>\steamapps\appmanifest_730.acf' -Pattern '"buildid"|"installdir"'
```

Typical default paths are not evidence because Steam libraries can be moved. Use the folder opened through Steam or its corresponding manifest.

### 2. Search shipped text files

The most relevant locations are `game/csgo/cfg`, script/schema directories, and server configurations. Inventory files first, then search selectively:

```bash
rg --files '<CS2_ROOT>/game/csgo/cfg'
rg -n --glob '*.cfg' --glob '*.txt' --glob '*.vdata' --glob '*.kv3' \
  '\b(cl_crosshair|viewmodel|cl_radar|mp_|sv_)' '<CS2_ROOT>/game/csgo'
```

This finds usage and shipped defaults, not a complete command list. Many resources live in VPK archives and many commands are registered only by binary modules. Read or extract VPKs only with a VPK-aware tool and never modify them during this process.

A `strings` or binary text search in modules under `game/bin/<platform>` and `game/csgo/bin/<platform>` may produce new E0 candidates. Random matches, missing metadata, and dynamic registration prevent it from establishing E1 or E2.

### 3. Capture the runtime list through the developer console

Start CS2 with the developer console, load a local map, and run:

```text
cvarlist
find crosshair
help cl_crosshairsize
differences
condump
```

In CS2, `cvarlist` includes ConVars and ConCommands; this process does not require a separate `cmdlist`. `condump` writes visible console content to `condumpXX.log`. Locate the file below the CS2 installation and archive it with build, platform, and context metadata.

A negative test in the main menu is insufficient. Client and game modules may register commands only after loading a map or starting a server.

### 4. Test one command reproducibly

For a ConVar:

```text
help cl_crosshairsize
cl_crosshairsize
cl_crosshairsize 2.5
cl_crosshairsize
```

Record the previous value, observe the expected effect, and restore it. Test minimum, maximum, or invalid values only in a recoverable local session. Action commands have no readback; record the initial state, command, console output, and state change instead.

Also test server commands directly in the console of an isolated dedicated server. Client RCON is only a transport and does not replace evidence that the command executed server-side.

## Verification record per command

Every new or changed command needs at least this record in its pull request:

```text
Command: cl_example
Change: new | changed | deprecated
Evidence level: E4
CS2 build: <build ID and displayed version>
Date: YYYY-MM-DD
Platform: windows-x86_64 | linux-x86_64
Context: client | listen-server | dedicated-server
Sources: <artifact/commit/link>
Metadata: type, default, min/max, relevant flags
Test: <initial state, input, expectation>
Result: <observed behavior>
Reset: <restored value or new map/session>
Reviewer: <name>
```

Never derive a global “checked with build X” statement from a name-only diff. If only a subset was retested, update only those entries' `checkedVersion` values.

## Removed or conflicting commands

1. Compare results in both preferred E1 sources.
2. Check the client, a local map, and a dedicated server when relevant so an unloaded module is not overlooked.
3. Search patch notes for a documented replacement.
4. Remove the command from presets and default activation while unresolved.
5. Mark it `deprecated` only after confirmed removal, keep it searchable, and name the replacement.
6. The serializer must reliably omit deprecated commands; imports should still explain them clearly.

## Cadence

- **After every public build:** E1 diff and complete verification of all affected catalog entries.
- **Monthly:** review open E0–E3 candidates, community reports, and platform-specific gaps.
- **Quarterly or before a major release:** E4 sample of all presets and all commands enabled by default in the three contexts.
- **After a reported failure:** reproduce the reported build; never advance only the global version string without verification.

This keeps ongoing work small: an update normally requires diffs and targeted regression tests, while new commands follow the full E0-to-E4 path.
