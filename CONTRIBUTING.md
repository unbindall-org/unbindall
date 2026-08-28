# Contributing

Danke, dass du Unbindall verbessern möchtest. Das Projekt soll für CS2-Spieler verständlich und für Maintainer mit wenig Zeit gut prüfbar bleiben.

## Lokales Setup

1. Repository forken und Branch von `main` erstellen.
2. `.env.example` nach `.env` kopieren und eigene Neon-Entwicklungsdaten eintragen.
3. `pnpm install` und `pnpm db:migrate` ausführen.
4. Entwicklung mit `pnpm dev` starten.

## Vor einem Pull Request

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Alle vier Prüfungen müssen erfolgreich sein. Pull Requests sollen eine konkrete Änderung enthalten und Screenshots für sichtbare UI-Änderungen mitbringen.

Änderungen an Persistenz, Authentifizierung oder Containerbetrieb müssen zusätzlich die passenden erweiterten Suiten bestehen:

```bash
pnpm test:db:up
pnpm test:integration
pnpm test:e2e
pnpm test:db:down
pnpm test:container
```

`test:integration` migriert die ausschließlich für Tests vorgesehene PostgreSQL-Datenbank vor der Suite aus einem leeren Schema. `test:e2e` benötigt einmalig einen Chromium-Browser (`pnpm exec playwright install chromium`). `test:container` baut den Produktionscontainer, prüft den DB-abhängigen Healthcheck, simuliert einen Datenbankausfall und führt den kleinen Login-/Autosave-/Export-Lasttest aus.

## Neue Commands

- Nur aktuell in CS2 vorhandene Commands aufnehmen.
- Den vollständigen [Wartungs- und Verifikationsprozess](docs/command-catalog-maintenance.md) bis Evidenzstufe E4 durchlaufen und das Prüfprotokoll im Pull Request ergänzen.
- Build, Plattform, Kontext, Quelle und Prüfdatum im Pull Request nennen.
- Client-, Server-, Practice-, Cheat- und Development-Commands klar trennen.
- Wertebereich, Standardwert und verständliche deutsche Beschreibung ergänzen.

## Neue Module

Ein Modul besitzt einen eindeutigen Eintrag in `src/features/generator/modules/registry.ts`. Eigene Daten gehören in das versionierte `GeneratorDocument`, nicht in lose Local-Storage-Keys. Jede neue Ausgabe muss durch den zentralen Serializer laufen und durch mindestens einen Test abgedeckt sein.

Wenn sich das persistierte Dokumentformat ändert, erhöhe die `GENERATOR_SCHEMA_VERSION` und ergänze eine rückwärtskompatible Migration in `normalizeDocument`.

## Commits und Reviews

- Kleine, beschreibende Commits bevorzugen.
- Keine Secrets, `.env`-Dateien oder echte Spielerinformationen committen.
- Dependency-Updates nicht mit Feature-Änderungen vermischen.
- Verhalten und Motivation im PR beschreiben; Code allein ist keine Produktentscheidung.
