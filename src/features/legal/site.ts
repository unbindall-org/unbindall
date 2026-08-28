/**
 * Zentrale Stammdaten für Impressum und Datenschutzerklärung.
 *
 * ALLE mit "PLATZHALTER" markierten Werte müssen vor dem Livegang ersetzt
 * werden. Sie werden auf den Rechtsseiten sichtbar hervorgehoben, damit keiner
 * versehentlich online geht.
 */
export const legal = {
  /** Ladungsfähige Anschrift nach § 5 DDG. Kein Postfach. */
  operator: "PLATZHALTER: Vor- und Nachname",
  addressLines: [
    "PLATZHALTER: c/o IP-Management (Kundennummer)",
    "PLATZHALTER: Ludwig-Erhard-Str. 18",
    "PLATZHALTER: 20459 Hamburg",
    "Deutschland",
  ],
  /** Pflicht: E-Mail plus ein zweiter, schneller Kontaktweg. */
  email: "PLATZHALTER: kontakt@unbindall.org",
  secondContact: "PLATZHALTER: Telefonnummer oder Link zum Kontaktformular",
  /** Nur angeben, falls tatsächlich vorhanden. Sonst auf null lassen. */
  vatId: null as string | null,

  /** Auftragsverarbeiter nach Art. 28 DSGVO. */
  hostingProvider: "PLATZHALTER: Hosting-Anbieter, vollständige Anschrift, Serverregion",
  databaseProvider: "PLATZHALTER: Neon Inc., Anschrift laut abgeschlossenem DPA, Region (empfohlen: EU, AWS eu-central-1)",
  emailProvider: null as string | null,

  /** Zuständig ist die Behörde des Bundeslandes deines Wohn-/Geschäftssitzes. */
  supervisoryAuthority: "PLATZHALTER: zuständige Landesdatenschutzbehörde mit Anschrift und Website",

  /** Stand der Rechtstexte. Bei jeder inhaltlichen Änderung mitziehen. */
  lastUpdated: "2026-08-28",
} as const;

export const siteName = "Unbindall";
export const siteUrl = "https://unbindall.org";

/** Erkennt die Platzhalter, damit sie im Markup hervorgehoben werden können. */
export function isPlaceholder(value: string | null): boolean {
  return typeof value === "string" && value.startsWith("PLATZHALTER");
}
