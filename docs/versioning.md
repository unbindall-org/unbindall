# Versionierung und automatische Speicherung

Jede Cloud-Config besitzt einen direkt lesbaren aktuellen Stand (`configs`) und ein unveränderliches Revisionslog (`config_revisions`). Der Head macht normale Lesevorgänge unabhängig von der Länge der Historie; das Log ermöglicht die Wiederherstellung jeder serverseitig bestätigten Revision.

## Schreibvorgang

`create`, manueller Speicherpunkt, Autosave, Restore sowie Verschieben in oder aus dem Papierkorb schreiben immer in einer PostgreSQL-Transaktion:

1. Der aktuelle Config-Datensatz wird mit `FOR UPDATE` gesperrt.
2. `expectedRevision` wird mit der aktuellen Revision verglichen.
3. Eine neue, unveränderliche Revision wird angehängt.
4. Dokument, Hash, Revisionsnummer und Zeitstempel des Heads werden aktualisiert.

Eine abweichende Revisionsnummer ergibt `CONFLICT`; ein älterer Browser-Tab überschreibt dadurch keinen neueren Stand. Jede Mutation trägt eine global eindeutige `mutationId`. Wiederholte Übertragungen derselben Mutation erzeugen keine zweite Revision. Manuelle Speicherpunkte können zusätzlich einen frei vergebenen Namen tragen.

## Snapshots und Patches

- Revision 1 ist immer ein vollständiger Snapshot.
- Spätestens jede 50. Revision ist ein Snapshot.
- Ein Patch, der mindestens 40 Prozent des vollständigen Dokuments benötigt, wird als Snapshot gespeichert.
- Arrays werden atomar ersetzt, Objekte feldweise verglichen.
- SHA-256 über kanonisches JSON sichert die Integrität rekonstruierter Stände.

Damit müssen für einen historischen Stand höchstens 49 Patches nach dem letzten Snapshot angewandt werden. `GeneratorDocument` bleibt die kanonische Wahrheit; die aktuelle CFG-Ausgabe wird daraus erzeugt und nur am Head für Exporte zwischengespeichert.

## Autosave

Der Browser speichert den Entwurf weiterhin unmittelbar lokal. Für eine aktive Cloud-Config wird zusätzlich nach einer Sekunde Inaktivität, spätestens aber nach fünf Sekunden kontinuierlicher Bearbeitung gespeichert. Der jeweils neueste noch nicht bestätigte Autosave liegt in IndexedDB und übersteht Reloads sowie Offline-Phasen.

Die Oberfläche unterscheidet lokal, ausstehend, synchronisierend, gespeichert, offline und Konflikt. Ein Konflikt behält den lokalen Stand und seine Queue bei, bis der Nutzer bewusst einen Serverstand lädt oder anderweitig auflöst.

## Wiederherstellung und Löschen

Ein Restore verändert keine vorhandene Revision. Er erzeugt einen neuen Head vom Typ `restore`, sodass auch die Wiederherstellung selbst rückgängig gemacht werden kann. Der Zeitpunkt-Endpunkt löst einen ISO-Zeitpunkt auf die letzte Revision zu oder vor diesem Zeitpunkt auf; bei gleicher Zeit entscheidet die Revisionsnummer.

Normales Löschen erzeugt eine `delete`-Revision und setzt `deleted_at`. Die Config bleibt samt Historie im Papierkorb. Erst explizites endgültiges Löschen entfernt Config und Revisionen über die Foreign-Key-Kaskade. Accountlöschung entfernt weiterhin sämtliche zugehörigen Daten.

Diese Anwendungshistorie ersetzt keine Infrastruktur-Backups. Neon/PostgreSQL-PITR bleibt erforderlich, um auch einen vollständigen Datenbankverlust oder administrative Fehloperationen abzusichern.
