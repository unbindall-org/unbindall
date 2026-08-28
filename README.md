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

Die direkte Verbindung für Migrationen entspricht der Empfehlung von Neon. Beide URLs müssen `sslmode=require` enthalten. Ersetze außerdem unbedingt `AUTH_SECRET`. Ein Secret kannst du beispielsweise so erzeugen:

```bash
openssl rand -base64 32
```

Die Social-Logins werden nur angezeigt, wenn die zugehörigen Variablen vollständig gesetzt sind:

- Discord: `AUTH_DISCORD_ID` und `AUTH_DISCORD_SECRET`; im Discord Developer Portal muss als Redirect `http://localhost:3000/api/auth/callback/discord` beziehungsweise in Produktion `https://DEINE-DOMAIN/api/auth/callback/discord` eingetragen sein.
- Steam: `STEAM_WEB_API_KEY` aus der Steam-Web-API-Key-Seite. Steam Login basiert nicht auf OAuth, sondern auf OpenID 2.0. Realm und Callback werden von der App aus `AUTH_URL` erzeugt und müssen bei Steam nicht separat registriert werden.

`AUTH_URL` muss deshalb in jeder Umgebung exakt auf die öffentlich erreichbare Origin zeigen, lokal also `http://localhost:3000`, in Produktion beispielsweise `https://unbindall.org`.

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
pnpm build        # Typprüfung + Produktions-Build
pnpm db:generate  # Migration aus dem Drizzle-Schema erzeugen
pnpm db:migrate   # offene Migrationen anwenden
pnpm db:studio    # Datenbankoberfläche öffnen
```

## Datenmodell

Auth.js verwendet die Tabellen `users`, `accounts`, `sessions` und `verification_tokens`. `configs` hält den aktuellen Stand, `config_revisions` die unveränderliche Historie aus Snapshots und Patches. Aktive Config-Namen sind pro Account eindeutig. Normales Löschen verschiebt eine Config samt Historie in den Papierkorb; beim Löschen eines Accounts werden Sessions, Provider-Konten, Configs und Revisionen kaskadierend entfernt. Das Revisionskonzept ist in [docs/versioning.md](docs/versioning.md) beschrieben.

Alle Login-Arten verwenden signierte JWT-Cookies. Passwörter werden ausschließlich als bcrypt-Hash gespeichert. Discord-Adressen werden nur dann zur sicheren Verknüpfung mit einem bestehenden Account genutzt, wenn Discord sie als verifiziert meldet. Steam-Identitäten werden mit einer State-Cookie, einer frischen OpenID-Nonce und einer serverseitigen `check_authentication`-Anfrage an Steam geprüft. Für eine öffentliche Produktion sollte zusätzlich E-Mail-Verifizierung und Rate-Limiting für Credentials sowie ein externer Secret-Manager ergänzt werden.

## Deployment

Der Server benötigt `DATABASE_URL`, `AUTH_SECRET`, `AUTH_URL` und – hinter einem vertrauenswürdigen Reverse Proxy – `AUTH_TRUST_HOST=true`. Für Discord kommen `AUTH_DISCORD_ID` und `AUTH_DISCORD_SECRET`, für Steam `STEAM_WEB_API_KEY` hinzu. Die Build-/Deployment-Umgebung benötigt zusätzlich `DATABASE_MIGRATION_URL`, wenn sie Migrationen ausführt. Vor dem Start einer neuen Version muss `pnpm db:migrate` gegen die direkte Neon-Verbindung ausgeführt werden. Die App benötigt eine Node.js-Laufzeit; ein rein statischer Export reicht wegen Auth.js und der Config-API nicht aus.

### Docker und Dokploy

Das Multi-Stage-`Dockerfile` baut Next.js als Standalone-Server. Das finale Image enthält weder Quellcode noch Entwicklungsabhängigkeiten und läuft als unprivilegierter Benutzer auf Port `3000`. Lokal lässt es sich so prüfen:

```bash
docker build -t unbindall .
docker run --rm -p 3000:3000 \
  -e DATABASE_URL='postgresql://…' \
  -e AUTH_SECRET='…' \
  -e AUTH_URL='http://localhost:3000' \
  -e AUTH_TRUST_HOST='true' \
  unbindall
```

In Dokploy wird das Repository als Anwendung mit dem Build-Typ `Dockerfile` eingerichtet. Der Dockerfile-Pfad ist `Dockerfile`, der Container-Port `3000`; ein eigener Startbefehl ist nicht nötig. Folgende Variablen gehören in die Runtime-Umgebung:

```dotenv
DATABASE_URL=postgresql://…-pooler…/neondb?sslmode=require
AUTH_SECRET=…
AUTH_URL=https://deine-domain.example
AUTH_TRUST_HOST=true
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
