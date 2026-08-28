# Command-Katalog

Der Katalog deckt drei Kontexte ab:

- normale Competitive-Autoexecs: Maus, Crosshair, Viewmodel, Radar, Audio, HUD, Performance und Binds
- Competitive-Server: Matchformat, Rundenzeiten, Economy, Overtime, Pausen, Zuschauerregeln und Warmup
- lokale Practice-Configs: Granatentraining, Trefferanzeigen, Respawns, Bots und freie Bewegung

Der kuratierte Stand umfasst 137 Console-Commands: 69 für normale Client-Configs, 40 für Competitive-Server und 28 für Practice. Hinzu kommen die getrennt gepflegten Standard-Bind-Aktionen. Diese Grenze ist bewusst deutlich kleiner als der vollständige Engine-Dump.

## Statusmodell

Jeder `CommandDefinition` besitzt einen `status` mit drei unabhängig auswertbaren Angaben:

- `verification`: `verified` ist im geprüften CS2-Dump vorhanden; `deprecated` fehlt dort oder wurde ersetzt und wird vom Serializer nie ausgegeben.
- `restrictions`: `offline-only` kennzeichnet lokale/private Server-Kontexte, `requires-cheats` zusätzlich Cheat-geschützte Commands.
- `checkedVersion`: der zuletzt geprüfte öffentliche CS2-Build.

In der Oberfläche entsprechen diese Werte den Badges „Verifiziert“, „Veraltet“, „Nur offline“, „Erfordert Cheats“ und „Zuletzt mit CS2-Version … geprüft“.

## Aktueller Prüfstand

Der Katalogstand wurde gegen CS2 `Build 24957633` vom 26. August 2026 geprüft. Als maschinennahe Referenz dient der laufend erzeugte [CS2-ConVar- und Command-Dump](https://cs2.poggu.me/dumped-data/convar-list/); der öffentliche Build lässt sich in der [SteamDB-Depot-Historie](https://steamdb.info/app/730/depots/) nachvollziehen.

Der bisherige Stand bestätigt überwiegend Name, grundsätzliche Syntax und relevante Flags im aktuellen Dump. Das ist noch kein vollständiger Verhaltenstest. Der mehrstufige [Wartungs- und Verifikationsprozess](command-catalog-maintenance.md) trennt deshalb Build-Nachweis, lokale Registrierung, Syntax und tatsächliche Wirkung. Practice-Commands sind zusätzlich als offline/privat markiert.

## Pflege nach einem CS2-Update

Die verbindlichen Evidenzstufen, Freigaberegeln, lokalen CS2-Prüfungen und PR-Nachweise stehen im [Wartungsleitfaden](command-catalog-maintenance.md). Kurzform: Build fixieren, Quellen diffen, nur betroffene Commands lokal nachtesten, Katalog und Tests ändern und erst danach Versionsangaben anheben. `cvarlist` deckt dabei ConVars und ConCommands ab; ein separates `cmdlist` wird nicht vorausgesetzt.

Action-Commands wie `bot_kick` oder `mp_warmup_end` werden ohne Argument serialisiert. Veraltete Commands bleiben suchbar, sind in der UI gesperrt und werden selbst dann nicht exportiert, wenn ein alter gespeicherter Entwurf sie noch als aktiv führt.
