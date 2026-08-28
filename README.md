# Unbindall — CS2 Autoexec Generator

Ein responsiver Next.js-Generator für Counter-Strike-2-Autoexecs. Einstellungen lassen sich suchen, visuell prüfen, als bestehende CFG importieren, herunterladen und mit einem Auth.js-Account in PostgreSQL speichern.

## Enthalten

- kuratierter Command-Katalog für Competitive-Autoexecs, Match-Server und Offline-Practice
- sechs getrennte Config-Arten: Matchmaking, Practice, Server, Offline, Warmup und Launch Options
- sichtbarer Prüfstatus pro Command: verifiziert/veraltet, Offline- und Cheat-Einschränkungen sowie geprüfter CS2-Build
- permanente Suche nach Namen, Console-Command und Beschreibung
- Live-Vorschauen für Crosshair, Radar und Viewmodel
- vollständige normale Keybinds für Bewegung, Kampf, Waffen, Granaten, Kommunikation und Interface
- Double-/Mehrfachbind-Modul: eine Aktion auf zwei bis vier Tasten
- validierte freie Custom-Binds
- gemeinsame Konflikterkennung über alle Bind-Module
- verlusttreuer Mehrfachimport für CFG, CS2-VCFG/KV1 und textuelles KV3; Kommentare, Aliases und unbekannte Commands bleiben erhalten
- typspezifischer Live-Code, Copy und Download für CFGs und Launch Options
- drei Schnellstart-Presets
- anonymer Entwurf im Browser
- Registrierung und Login über Auth.js Credentials, Discord OAuth 2.0 und Steam OpenID 2.0
- mit `bcrypt` gehashte Passwörter
- mehrere benutzergebundene Configs in PostgreSQL mit Autosave und vollständigem Versionsverlauf
- Drizzle-Schema und versionierte SQL-Migration
- responsive Desktop- und Mobile-Oberfläche

## Lokal starten

Voraussetzungen: Node.js 22 oder neuer, pnpm und ein bestehendes Neon-Projekt.

```bash
cp .env.example .env
```

Trage anschließend die beiden Verbindungen aus dem Neon-Dashboard ein:

- `DATABASE_URL`: gepoolte URL für die laufende Anwendung; der Hostname enthält `-pooler`
- `DATABASE_MIGRATION_URL`: direkte URL ohne `-pooler` für Drizzle-Migrationen
- `REDIS_URL`: Redis-Verbindung für die zentralen, instanzübergreifenden Rate-Limits

Die direkte Verbindung für Migrationen entspricht der Empfehlung von Neon. Beide URLs müssen `sslmode=require` enthalten. Ersetze außerdem unbedingt `AUTH_SECRET`. Ein Secret kannst du beispielsweise so erzeugen:

```bash
openssl rand -base64 32
```

Die Social-Logins werden nur angezeigt, wenn die zugehörigen Variablen vollständig gesetzt sind:

- Discord: `AUTH_DISCORD_ID` und `AUTH_DISCORD_SECRET`; im Discord Developer Portal muss als Redirect `http://localhost:3000/api/auth/callback/discord` beziehungsweise in Produktion `https://DEINE-DOMAIN/api/auth/callback/discord` eingetragen sein.
- Steam: `STEAM_WEB_API_KEY` aus der Steam-Web-API-Key-Seite. Steam Login basiert nicht auf OAuth, sondern auf OpenID 2.0. Realm und Callback werden von der App aus `AUTH_URL` erzeugt und müssen bei Steam nicht separat registriert werden.

`AUTH_URL` muss deshalb in jeder Umgebung exakt auf die öffentlich erreichbare Origin zeigen, lokal also `http://localhost:3000`, in Produktion beispielsweise `https://unbindall.org`. In Produktion muss `AUTH_EXPECTED_HOST` zusätzlich exakt den erwarteten Hostnamen enthalten. `AUTH_TRUST_HOST=true` ist nur hinter einem kontrollierten Reverse Proxy zulässig; `TRUSTED_PROXY_COUNT` gibt die Anzahl der vertrauenswürdigen Proxy-Hops an.

Danach:

```bash
pnpm install
pnpm db:migrate
pnpm dev
```

Die App läuft anschließend unter [http://localhost:3000](http://localhost:3000).

## Befehle

```bash
pnpm dev          # Entwicklungsserver
pnpm typecheck    # strikte TypeScript-Prüfung
pnpm lint         # ESLint
pnpm test         # Domain- und Serializer-Tests
pnpm test:db:up   # isolierte PostgreSQL-Testdatenbank starten
pnpm test:integration # Router, Migrationen, Auth und Kaskaden gegen PostgreSQL
pnpm test:e2e     # Browser-Flows mit Playwright/Chromium
pnpm test:container # Container-Smoke, DB-Ausfall und einfacher Lasttest
pnpm test:db:down # Testdatenbank und Testvolumes entfernen
pnpm build        # Typprüfung + Produktions-Build
pnpm db:generate  # Migration aus dem Drizzle-Schema erzeugen
pnpm db:migrate   # offene Migrationen anwenden
pnpm db:studio    # Datenbankoberfläche öffnen
```

## Datenmodell

Auth.js verwendet die Tabellen `users`, `accounts`, `sessions` und `verification_tokens`. `configs` hält den aktuellen Stand, `config_revisions` die unveränderliche Historie aus Snapshots und Patches. Aktive Config-Namen sind pro Account eindeutig. Normales Löschen verschiebt eine Config samt Historie in den Papierkorb; beim Löschen eines Accounts werden Sessions, Provider-Konten, Configs und Revisionen kaskadierend entfernt. Das Revisionskonzept ist in [docs/versioning.md](docs/versioning.md) beschrieben.

`command_definitions` ist die Laufzeitquelle für den Generator-Katalog. Migration `0006` übernimmt den kuratierten TypeScript-Bestand vollständig als zweisprachigen Seed. Öffentliche Lesezugriffe verwenden einen sortierten, für 60 Sekunden getaggten Snapshot; Admin-Änderungen invalidieren ihn sofort. Die Pflege erfolgt im Plattform-Adminbereich. Veröffentlichte Command-Namen sind stabil, parallele Änderungen werden über eine optimistische Revision erkannt und Entwürfe können erst nach dem Deaktivieren gelöscht werden.

Accounts haben die Rollen `user`, `moderator` und `platform_admin`. Platform-Admins dürfen zusätzlich den Moderatorenbereich öffnen und können Rollen im Adminbereich verwalten; Moderatoren erhalten keinen Adminzugriff. Der erste Platform-Admin wird nach der Registrierung einmalig kontrolliert in der Datenbank gesetzt, beispielsweise mit `UPDATE users SET role = 'platform_admin' WHERE email = 'admin@example.com';`. Weitere Rollenänderungen erfolgen anschließend im Adminbereich.

Alle Login-Arten verwenden signierte JWT-Cookies. Passwörter werden ausschließlich als bcrypt-Hash gespeichert. Discord-Konten werden niemals automatisch anhand einer E-Mail-Adresse mit einem bestehenden Account verknüpft. Eine Verknüpfung ist nur explizit in einer bereits authentifizierten Sitzung unter „Account & Daten“ möglich. Steam-Identitäten werden mit einer State-Cookie, einer frischen OpenID-Nonce und einer serverseitigen `check_authentication`-Anfrage an Steam geprüft.

Redis begrenzt Registrierung, Credentials-Login, Auth-Endpunkte, Steam-Start und -Callback, Account-Löschung, Exporte und Config-Schreiblast jeweils nach IP und/oder Account. Fällt Redis in Produktion aus, werden die geschützten Operationen sicher abgewiesen. Pro Account gelten außerdem maximal 25 Configs inklusive Papierkorb und 10 MiB logisches Datenvolumen. Revisionshistorien werden ab 200 Einträgen auf die letzten 100 Stände verdichtet; Config-Dokumente akzeptieren höchstens 500 `commandValues`.

## Deployment

Der Server benötigt `DATABASE_URL`, `REDIS_URL`, `AUTH_SECRET`, `AUTH_URL`, `AUTH_EXPECTED_HOST` und eine explizite `AUTH_TRUST_HOST`-Entscheidung. Hinter einem vertrauenswürdigen Reverse Proxy kommen `AUTH_TRUST_HOST=true` und `TRUSTED_PROXY_COUNT` hinzu. Für Discord müssen `AUTH_DISCORD_ID` und `AUTH_DISCORD_SECRET` gemeinsam gesetzt werden, für Steam optional `STEAM_WEB_API_KEY`. Die Produktionskonfiguration wird beim Serverstart zentral validiert; unsichere Secrets, HTTP-Origins, unerwartete Domains, ungepoolte/TLS-lose Datenbank-URLs und inkonsistente Provider-Konfigurationen brechen den Start ab. Die Build-/Deployment-Umgebung benötigt zusätzlich `DATABASE_MIGRATION_URL`, wenn sie Migrationen ausführt. Vor dem Start einer neuen Version muss `pnpm db:migrate` gegen die direkte Neon-Verbindung ausgeführt werden. Die App benötigt eine Node.js-Laufzeit; ein rein statischer Export reicht wegen Auth.js und der Config-API nicht aus.

### Docker und Dokploy

Das Multi-Stage-`Dockerfile` baut Next.js als Standalone-Server. Das finale Image enthält weder Quellcode noch Entwicklungsabhängigkeiten und läuft als unprivilegierter Benutzer auf Port `3000`. Lokal lässt es sich so prüfen:

```bash
docker build -t unbindall .
docker run --rm -p 3000:3000 \
  -e DATABASE_URL='postgresql://…-pooler…/neondb?sslmode=require' \
  -e REDIS_URL='rediss://…' \
  -e AUTH_SECRET='…' \
  -e AUTH_URL='https://deine-domain.example' \
  -e AUTH_EXPECTED_HOST='deine-domain.example' \
  -e AUTH_TRUST_HOST='true' \
  -e TRUSTED_PROXY_COUNT='1' \
  unbindall
```

In Dokploy wird das Repository als Anwendung mit dem Build-Typ `Dockerfile` eingerichtet. Der Dockerfile-Pfad ist `Dockerfile`, der Container-Port `3000`; ein eigener Startbefehl ist nicht nötig. Folgende Variablen gehören in die Runtime-Umgebung:

```dotenv
DATABASE_URL=postgresql://…-pooler…/neondb?sslmode=require
REDIS_URL=rediss://…
AUTH_SECRET=…
AUTH_URL=https://deine-domain.example
AUTH_EXPECTED_HOST=deine-domain.example
AUTH_TRUST_HOST=true
TRUSTED_PROXY_COUNT=1
```

Optional kommen die Discord- und Steam-Variablen aus dem Abschnitt „Lokal starten“ hinzu. Secrets werden nicht als Docker-Build-Argumente übergeben. Der Healthcheck ruft `/api/health` auf.

Migrationen sind absichtlich kein Teil des Container-Starts, damit parallele oder neu gestartete Instanzen sie nicht gleichzeitig ausführen. Vor dem Deployment einer Version mit Schemaänderungen wird einmalig in einer kontrollierten Umgebung ausgeführt:

```bash
DATABASE_MIGRATION_URL='postgresql://…' pnpm db:migrate
```

Die GitHub-Actions-Pipeline baut das Produktions-Image bei jedem Pull Request und jedem Push auf `main`. Dadurch werden Änderungen am Dockerfile bereits vor einem Dokploy-Deployment geprüft.

## Mitmachen

Die Erweiterungspunkte und Modulgrenzen sind in [docs/architecture.md](docs/architecture.md) beschrieben. Lies vor dem ersten Pull Request bitte [CONTRIBUTING.md](CONTRIBUTING.md). Insbesondere neue Generator-Module sollen ihr Datenmodell, ihre Validierung und mindestens einen Serializer-Test gemeinsam liefern.

## Lizenz

Unbindall ist freie Open-Source-Software unter der [GNU Affero General Public License v3.0](LICENSE).

Umfang und Statusmodell stehen in [docs/command-catalog.md](docs/command-catalog.md). Der mehrstufige Ablauf für Recherche, lokale CS2-Prüfung und Pflege nach Updates steht im [Wartungsleitfaden](docs/command-catalog-maintenance.md).
