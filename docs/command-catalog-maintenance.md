# Command-Katalog pflegen und erweitern

Dieser Leitfaden definiert, wie Commands entdeckt, geprüft, freigegeben und nach CS2-Updates erneut bewertet werden. Ziel ist ein vollständiger, aber kuratierter Katalog für normale Competitive-Configs, Competitive-Server und lokale Practice-Configs. Ein vollständiger Engine-Dump ist eine Eingangsquelle, aber nicht der Produktumfang.

## Grundsatz: Existenz ist noch keine Verifikation

Ein Command kann in einem Dump stehen und trotzdem im falschen Kontext wirkungslos, nur auf einer Plattform vorhanden oder durch Flags eingeschränkt sein. Deshalb werden vier Fragen getrennt beantwortet:

1. Ist der Name in einem bestimmten Build und auf einer bestimmten Plattform vorhanden?
2. Ist der Command im passenden Laufzeitkontext registriert?
3. Lässt er sich mit der dokumentierten Syntax ausführen und auslesen?
4. Erzeugt er die beschriebene Wirkung?

Erst die letzte Stufe rechtfertigt langfristig das öffentliche Badge „Verifiziert“. Die bisherige Katalogprüfung belegt überwiegend nur die Existenz in einem Dump. Bestehende Einträge müssen daher schrittweise durch den folgenden Prozess auf die höhere Evidenzstufe gebracht werden.

## Evidenzstufen

| Stufe | Bedeutung | Erforderlicher Nachweis |
| --- | --- | --- |
| E0 – Kandidat | In Patch Notes, einer Config, einem Forum oder einer Suche gefunden | Link oder Fundstelle; noch nicht für den Katalog freigegeben |
| E1 – Build-bestätigt | In einem build- und plattformgebundenen ConVar-/Command-Extrakt vorhanden | Build-ID, Plattform, Quelle und möglichst Commit oder Artefakt-Hash |
| E2 – Laufzeit-bestätigt | Im richtigen lokalen Kontext registriert | Ausgabe von `help`, `find` oder `cvarlist`; Client, Listen- oder Dedicated-Server angeben |
| E3 – Syntax-bestätigt | Setzen und Readback funktionieren; Typ, Default, Bereich und Flags sind geprüft | reproduzierbarer Konsolentest samt Ergebnis; bei Action-Commands die Konsolenausgabe |
| E4 – Verhaltensbestätigt | Die beschriebene Wirkung wurde im Spiel oder Serverzustand beobachtet | kurzer Testfall mit Erwartung, Ergebnis, Map/Modus und Rücksetzschritt |

Freigaberegeln:

- Neue öffentliche Commands benötigen E4. Bis dahin bleiben sie außerhalb des Katalogs oder in einem Wartungs-PR als Kandidat.
- Änderungen an Label oder Beschreibung dürfen auf E3 beruhen, wenn sie keine Wirkungsbehauptung verändern.
- Presets und `enabledByDefault` dürfen nur E4-Commands verwenden.
- Server- und Practice-Commands müssen E4 im jeweiligen Kontext erreichen; ein Client-Test genügt dafür nicht.
- `offline-only` und `requires-cheats` sind Einschränkungen, keine Evidenzstufen.
- `deprecated` wird erst gesetzt, wenn das Fehlen oder ein Ersatz bestätigt wurde. Ein einzelner fehlender Treffer in einem Dump reicht nicht.

## Quellen und ihre Aufgabe

Keine Quelle beantwortet allein alle vier Fragen:

- [Valve-Patch-Notes](https://store.steampowered.com/news/app/730) und die [Valve Developer Community](https://developer.valvesoftware.com/wiki/Counter-Strike_2) dokumentieren beabsichtigte Änderungen, sind aber nicht vollständig.
- [CS2OpenDev SchemaTracker](https://github.com/CS2OpenDev/CS2OpenDev-SchemaTracker) erzeugt deterministische, nach Build und Plattform getrennte `convars.json`, `commands.json` und `provenance.json` direkt aus ausgelieferten Runtime-Binaries. Das ist die bevorzugte E1-Quelle.
- [SteamTracking/GameTracking-CS2](https://github.com/SteamTracking/GameTracking-CS2/tree/master/DumpSource2) führt aktuelle Text-Dumps und ausgelieferte Spieldateien. Es eignet sich gut für Diffs und als zweite E1-Quelle.
- Der [Poggu-ConVar-Dump](https://cs2.poggu.me/dumped-data/convar-list/) ist gut durchsuchbar und nützlich zur Gegenprüfung. Seine [Methodendokumentation](https://cs2.poggu.me/reverse-engineering/ConVars/) erklärt, dass die Daten aus den internen ConVar-Strukturen gewonnen werden.
- SteamDB hilft, eine öffentliche Build-ID zeitlich einzuordnen. Für die lokale Prüfung ist die Build-ID aus dem eigenen Steam-Manifest maßgeblich.
- Community-Configs, Videos, Wikis und Suchergebnisse liefern E0-Kandidaten, aber niemals allein den Status „Verifiziert“.

Bei Widersprüchen gewinnt der reproduzierbare Laufzeittest für exakt den dokumentierten Build, die Plattform und den Kontext. Der Widerspruch wird trotzdem im Prüfprotokoll festgehalten.

## Mehrstufiger Wartungsprozess

### Stufe 1: Update erkennen und Prüfstand fixieren

Bei jedem öffentlichen CS2-Update:

1. öffentliche und lokale Build-ID erfassen;
2. Datum, Plattformen und verfügbare Testkontexte festlegen;
3. die verwendeten Dumps auf einen Commit oder ein unveränderliches Artefakt pinnen;
4. `CS2_CATALOG_VERSION` noch nicht ändern.

Ein globaler Versionsstring darf erst aktualisiert werden, wenn alle geänderten Commands geprüft sind. Pro Command bleibt `checkedVersion` die genauere Aussage.

### Stufe 2: Maschinellen Diff erzeugen

Alten und neuen E1-Datenstand nach folgenden Änderungen vergleichen:

- hinzugefügte und entfernte Namen;
- Wechsel zwischen ConVar und Action-Command;
- Typ, Default, Minimum und Maximum;
- Flags wie `cheat`, `developmentonly`, `hidden`, `replicated`, `clientdll` oder `gamedll`;
- geänderte Hilfetexte.

Priorität haben Commands, die bereits im Katalog, in einem Preset oder standardmäßig aktiviert sind. Neue Engine-Einträge werden nur dann zu Kandidaten, wenn sie in einen der drei Produktkontexte passen.

### Stufe 3: Kandidaten kuratieren

Ein Command gehört in den Katalog, wenn er eine typische Config-Aufgabe löst, dauerhaft konfigurierbar oder sinnvoll automatisierbar ist und sich für normale Spieler verständlich erklären lässt. Nicht aufgenommen werden reine Entwicklerdiagnostik, interne UI-Aktionen, gefährliche Admin-Befehle, Duplikate ohne eigenen Nutzen sowie Commands, die nur deshalb existieren, weil sie im Dump stehen.

Für jeden Kandidaten werden vor dem Test festgelegt:

- Zielkontext: `client`, `competitive-server` oder `practice`;
- erwarteter Typ und zulässige Werte;
- erwartete Einschränkungen;
- konkreter E4-Test und Rücksetzschritt.

### Stufe 4: Lokal in CS2 prüfen

Der lokale Test ist optional für die reine Kandidatensuche, aber Pflicht für E2 bis E4. Er kann auf einem normalen Client, einem lokalen Listen-Server oder einem isolierten Dedicated Server stattfinden.

Empfohlene Testmatrix:

| Katalogbereich | Mindestkontext | Zusätzlicher Kontext |
| --- | --- | --- |
| normale Config | Client auf lokaler Map | zweites unterstütztes Betriebssystem bei plattformsensitiven Commands |
| Server-Config | lokaler Dedicated Server | Listen-Server zur Erkennung abweichender Registrierung |
| Practice | lokale Map/Listen-Server | Dedicated Server, wenn der Command dort angeboten wird |

Cheat-Tests nur in einer lokalen oder privaten Sitzung durchführen. `sv_cheats 1`, `-insecure`, RCON- oder Netconsole-Zugänge gehören nicht auf einen öffentlich erreichbaren Testserver. Passwörter und Tokens dürfen nicht in Condumps oder PRs landen.

### Stufe 5: Katalog und Tests ändern

Nach bestandenem E4-Test:

1. `CommandDefinition` mit deutschem Label, Beschreibung, Typ, Default, Bereich und Einschränkungen ergänzen oder korrigieren;
2. nur sinnvolle UI-Grenzen anbieten – Engine-Minimum und -Maximum sind nicht automatisch gute Reglergrenzen;
3. Action-Commands ohne künstliches Argument modellieren;
4. Serializer-, Import- und Statusfälle testen;
5. Presets separat und im vorgesehenen Kontext testen;
6. `checkedVersion` und erst am Ende gegebenenfalls `CS2_CATALOG_VERSION` aktualisieren.

Die normalen Projektprüfungen sind:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

### Stufe 6: Review, Veröffentlichung und Nachbeobachtung

Der Review prüft nicht nur den Command-Namen, sondern auch Evidenz, Kontext, Einschränkungen, Beschreibung und Anti-Bloat-Kriterium. Nach Veröffentlichung werden Fehlerberichte dem betroffenen Build zugeordnet. Ein Command wird bei Unsicherheit zuerst aus Presets und Standardaktivierung entfernt; `deprecated` folgt erst nach bestätigtem Wegfall oder bestätigtem Ersatz.

## Lokale CS2-Installation durchsuchen

In CI- und Container-Umgebungen wie der aktuellen ist CS2 häufig nicht installiert. Dort endet die belastbare Prüfung bei E1: Kandidaten und Diffs können vorbereitet, aber keine neuen Commands als „Verifiziert“ freigegeben werden. E2 bis E4 laufen anschließend auf einem separaten Rechner mit Steam und lokalen CS2-Dateien.

### 1. Installationswurzel und Build bestimmen

Am zuverlässigsten ist **Steam → Bibliothek → Counter-Strike 2 → Eigenschaften → Installierte Dateien → Durchsuchen**. Der gewählte Steam-Library-Ordner enthält außerdem:

```text
<STEAM_LIBRARY>/steamapps/appmanifest_730.acf
<STEAM_LIBRARY>/steamapps/common/Counter-Strike Global Offensive/
```

Build-ID und Installationsnamen lassen sich read-only aus dem Manifest lesen:

```bash
rg -n '"(buildid|installdir)"' '<STEAM_LIBRARY>/steamapps/appmanifest_730.acf'
```

PowerShell:

```powershell
Select-String -Path '<STEAM_LIBRARY>\steamapps\appmanifest_730.acf' -Pattern '"buildid"|"installdir"'
```

Typische Standardpfade sind kein Beweis, weil Steam Libraries frei verschoben werden können. Der über Steam geöffnete Ordner oder das zugehörige Manifest ist maßgeblich.

### 2. Ausgelieferte Textdateien durchsuchen

Interessant sind vor allem `game/csgo/cfg`, vorhandene Script-/Schema-Verzeichnisse und Server-Configs. Zuerst Dateien inventarisieren, dann gezielt suchen:

```bash
rg --files '<CS2_ROOT>/game/csgo/cfg'
rg -n --glob '*.cfg' --glob '*.txt' --glob '*.vdata' --glob '*.kv3' \
  '\b(cl_crosshair|viewmodel|cl_radar|mp_|sv_)' '<CS2_ROOT>/game/csgo'
```

Das findet Verwendungen und ausgelieferte Defaults, aber keine vollständige Command-Liste. Viele Ressourcen liegen in VPK-Archiven und viele Commands werden erst durch Binärmodule registriert. VPKs nur mit einem VPK-fähigen Werkzeug lesen oder extrahieren und niemals für diesen Prozess verändern.

Eine `strings`- oder Binärtextsuche in Modulen unter `game/bin/<platform>` und `game/csgo/bin/<platform>` darf neue E0-Kandidaten liefern. Sie ist wegen zufälliger Treffer, fehlender Metadaten und dynamischer Registrierung kein E1- oder E2-Nachweis.

### 3. Laufzeitliste über die Entwicklerkonsole erfassen

CS2 mit Entwicklerkonsole starten, eine lokale Map laden und nacheinander verwenden:

```text
cvarlist
find crosshair
help cl_crosshairsize
differences
condump
```

`cvarlist` listet in CS2 ConVars und ConCommands; ein separates `cmdlist` ist für diesen Ablauf nicht erforderlich. `condump` schreibt den sichtbaren Konsoleninhalt in eine `condumpXX.log`. Die Datei anschließend unterhalb der CS2-Installation suchen und zusammen mit Build, Plattform und Kontext archivieren.

Ein negativer Test im Hauptmenü ist nicht ausreichend: Client- und Game-Module registrieren Commands teilweise erst nach dem Laden einer Map oder dem Start eines Servers.

### 4. Einzelnen Command reproduzierbar testen

Für eine ConVar:

```text
help cl_crosshairsize
cl_crosshairsize
cl_crosshairsize 2.5
cl_crosshairsize
```

Vorherigen Wert notieren, erwartete Wirkung beobachten und anschließend wiederherstellen. Minimum, Maximum oder ungültige Werte nur in einer rücksetzbaren lokalen Sitzung testen. Bei Action-Commands gibt es keinen Readback; hier werden Ausgangszustand, Ausführung, Konsolenausgabe und Zustandsänderung dokumentiert.

Server-Commands werden zusätzlich direkt in der Konsole eines isolierten Dedicated Servers geprüft. Client-RCON ist nur ein Transportweg und ersetzt nicht die Angabe, dass der Command serverseitig ausgeführt wurde.

## Prüfprotokoll pro Command

Jeder neue oder geänderte Command erhält im PR mindestens dieses Protokoll:

```text
Command: cl_example
Änderung: neu | geändert | veraltet
Evidenzstufe: E4
CS2-Build: <Build-ID und Versionsanzeige>
Datum: YYYY-MM-DD
Plattform: windows-x86_64 | linux-x86_64
Kontext: client | listen-server | dedicated-server
Quellen: <Artefakt/Commit/Link>
Metadaten: Typ, Default, Min/Max, relevante Flags
Test: <Ausgangszustand, Eingabe, Erwartung>
Ergebnis: <beobachtetes Verhalten>
Rücksetzung: <zurückgesetzter Wert oder neue Map/Session>
Reviewer: <Name>
```

Ein globaler „mit Build X geprüft“-Vermerk darf nicht aus einem reinen Namens-Diff abgeleitet werden. Wenn nur ein Teil nachgetestet wurde, werden ausschließlich die betroffenen `checkedVersion`-Werte angehoben.

## Vorgehen bei entfernten oder widersprüchlichen Commands

1. Treffer in beiden bevorzugten E1-Quellen vergleichen.
2. Client, lokale Map und gegebenenfalls Dedicated Server prüfen, damit kein noch nicht geladenes Modul übersehen wird.
3. Patch Notes oder einen dokumentierten Ersatz suchen.
4. Bis zur Klärung aus Presets und Standardaktivierung entfernen.
5. Erst bei bestätigtem Wegfall als `deprecated` markieren, im Katalog suchbar lassen und Ersatz nennen.
6. Serializer muss veraltete Commands weiterhin zuverlässig vom Export ausschließen; der Import soll sie verständlich anzeigen.

## Taktung

- **Nach jedem öffentlichen Build:** E1-Diff und vollständige Prüfung aller betroffenen Katalogeinträge.
- **Monatlich:** offene E0–E3-Kandidaten, Community-Meldungen und plattformspezifische Lücken sichten.
- **Quartalsweise oder vor einem größeren Release:** E4-Stichprobe aller Presets und aller standardmäßig aktivierten Commands in den drei Kontexten.
- **Bei gemeldeter Fehlfunktion:** den gemeldeten Build reproduzieren; nicht ungeprüft nur den globalen Versionsstring erhöhen.

So bleibt die laufende Arbeit klein: Ein Update erfordert normalerweise nur Diffs und gezielte Regressionstests, während neue Commands den vollständigen E0-bis-E4-Pfad durchlaufen.
