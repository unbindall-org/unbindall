# Architektur

Unbindall ist eine Next.js-App mit drei klaren Schichten: Web/API, Generator-Domain und Infrastruktur.
Fachliche Client-Server-Kommunikation läuft ausschließlich typisiert über tRPC und TanStack Query; Server Actions werden nicht verwendet.

## Verzeichnisstruktur

```text
src/
├── app/                         Next.js-Seiten, Auth- und tRPC-Handler
├── db/                          Drizzle-Verbindung und PostgreSQL-Schema
├── features/
│   ├── auth/components/         Auth-Oberfläche
│   ├── auth/server/             Steam OpenID, Provider-Konten und Auth-Secrets
│   └── generator/
│       ├── catalog/             kuratierte CS2-Commands und Bind-Aktionen
│       ├── components/          Generator- und Modul-Oberflächen
│       ├── domain/              Dokument, Validierung, Import und Export
│       └── modules/             Registry der sichtbaren Generator-Module
├── trpc/                        Kontext, Router, Prozeduren und Query-Provider
└── types/                       externe TypeScript-Erweiterungen
```

## GeneratorDocument

`GeneratorDocument` ist das einzige persistierte Generatorformat. Es enthält:

- `schemaVersion`
- `configType` (`matchmaking`, `practice`, `server`, `offline`, `warmup` oder `launch-options`)
- Werte und Aktivierungsstatus der Console-Commands
- normale Binds
- Double-/Mehrfachbinds
- freie Custom-Binds
- bis zu zehn verlustfrei erhaltene CFG-, VCFG- oder KV3-Importquellen

Local Storage, IndexedDB, Neon und Config-Import werden beim Einlesen über `normalizeDocument` normalisiert. Alte flache Entwürfe und Dokumente ohne Typ werden automatisch als Matchmaking-Config in das versionierte Format übernommen.

Cloud-Configs verwenden einen vollständigen aktuellen Head und ein append-only Revisionslog aus hybriden Snapshots und Patches. Autosaves prüfen die erwartete Revisionsnummer optimistisch und werden offline idempotent in IndexedDB gepuffert. Details und Wiederherstellungssemantik stehen in [versioning.md](versioning.md).

Klassische CFG-Dateien bleiben beim Import wortgetreu und in Dateireihenfolge erhalten. Der Serializer setzt die editierbaren Generator-Werte danach als Overrides. Textuelle CS2-VCFG/KV1- und KV3-Dateien werden in ausführbare ConVar- und Bind-Zeilen übersetzt; ihre vollständige Originalquelle bleibt zusätzlich als Kommentarblock im Export und im Dokument gespeichert.

## Module

Die Modul-Registry steuert Navigation, Suche und Rendering. Einstellungsbereiche verwenden den gemeinsamen Command-Katalog. Bind-Module dürfen eigene strukturierte Daten besitzen, müssen ihre finale Ausgabe aber über `resolveBindings` und `serializeConfig` erzeugen. Dadurch gelten Konfliktprüfung, Escaping und Deduplizierung überall gleich.

Ein Double-Bind bedeutet in Unbindall: mehrere Tasten führen dieselbe einzelne Aktion aus. Eine Taste, die mehrere Bewegungs- oder Angriffsaktionen automatisiert, ist bewusst nicht Teil des Generators.

## Datenfluss

```text
UI-Modul → GeneratorDocument → Typfilter → Validierung → Serializer → *.cfg / Launch Options
                         └────→ IndexedDB → TanStack Query → tRPC → Auth.js → Drizzle → Neon JSONB
```

## Sicherheitsgrenzen

- Geschützte tRPC-Prozeduren leiten die User-ID ausschließlich aus der serverseitigen Auth.js-Session ab.
- Updates und Deletes filtern immer nach Config-ID und User-ID.
- Revisionen werden atomar mit dem aktuellen Head geschrieben; veraltete Clients erhalten einen Konflikt statt eines stillen Überschreibens.
- Custom-Binds erlauben nur eine Aktion und sperren Commands, die andere Configs laden oder Bindings global verändern.
- Credentials-Passwörter werden mit bcrypt gehasht.
- Discord läuft über den Auth.js-OAuth-Provider; nur von Discord verifizierte E-Mail-Adressen werden automatisch verknüpft.
- Steam-Assertions werden per State-Cookie, Callback-Bindung, Nonce-Frische und direkter OpenID-Verifikation bei Steam geprüft. Ein kurzlebiger HMAC-Token übergibt die bestätigte Steam-ID anschließend intern an Auth.js.
- Secrets bleiben ausschließlich in der Laufzeitumgebung.
