# Command Catalog

The catalog covers three contexts:

- standard competitive autoexecs: mouse, crosshair, viewmodel, radar, audio, HUD, performance, and binds
- competitive servers: match format, round times, economy, overtime, pauses, spectator rules, and warmup
- local practice configurations: grenade practice, hit visualization, respawns, bots, and free movement

The curated catalog contains 137 console commands: 69 for normal client configurations, 40 for competitive servers, and 28 for practice, plus seven Steam launch options. Standard binding actions are maintained separately. This intentionally remains much smaller than a complete engine dump.

At runtime, definitions come from `command_definitions`. The platform admin area manages text, control type, value range, options, configuration contexts, verification status, order, and publication. The TypeScript list remains a verified seed for new installations; production changes are not loaded from client code.

## Status model

Every `CommandDefinition` has a `status` with three independently evaluated fields:

- `verification`: `verified` means the command exists in the checked CS2 dump; `deprecated` means it is absent or replaced and the serializer never emits it.
- `restrictions`: `offline-only` marks local/private server contexts, while `requires-cheats` additionally marks cheat-protected commands.
- `checkedVersion`: the latest public CS2 build against which the command was checked.

The UI represents these values with localized badges equivalent to “Verified,” “Deprecated,” “Offline only,” “Requires cheats,” and “Last checked with CS2 version …”.

## Current verification baseline

The catalog was checked against CS2 `Build 24957633` from August 26, 2026. The continuously generated [CS2 ConVar and command dump](https://cs2.poggu.me/dumped-data/convar-list/) is used as a machine-oriented reference; the public build can be cross-checked in the [SteamDB depot history](https://steamdb.info/app/730/depots/).

The current baseline mostly confirms names, basic syntax, and relevant flags in the dump. It is not a complete behavior test. The staged [maintenance and verification process](command-catalog-maintenance.md) therefore separates build evidence, local registration, syntax, and observed behavior. Practice commands are additionally marked for offline/private use.

## Maintenance after a CS2 update

The binding evidence levels, publication rules, local CS2 checks, and pull-request records are in the [maintenance guide](command-catalog-maintenance.md). In short: pin the build, diff sources, locally retest only affected commands, update the catalog and tests, then advance version metadata. `cvarlist` covers both ConVars and ConCommands; the process does not assume a separate `cmdlist`.

Action commands such as `bot_kick` and `mp_warmup_end` are serialized without an argument. Deprecated commands remain searchable and disabled in the UI, and are never exported even when an older saved draft still marks them as enabled.
