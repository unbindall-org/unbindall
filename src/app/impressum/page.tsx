import type { Metadata } from "next";
import { Field, LegalShell } from "@/features/legal/components/legal-shell";
import { legal, siteName } from "@/features/legal/site";

export const metadata: Metadata = {
  title: `Impressum — ${siteName}`,
  description: "Anbieterkennzeichnung nach § 5 DDG.",
  robots: { index: false, follow: true },
};

export default function ImpressumPage() {
  return (
    <LegalShell
      eyebrow="RECHTLICHES"
      title="Impressum"
      lead="Anbieterkennzeichnung nach § 5 Digitale-Dienste-Gesetz (DDG)."
    >
      <section className="legal-section">
        <h2>Anbieter</h2>
        <address className="legal-address">
          <Field value={legal.operator} />
          {legal.addressLines.map((line) => <span key={line}><Field value={line} /></span>)}
        </address>
        <p className="legal-hint">
          Die Anschrift muss ladungsfähig sein: eine echte Zustelladresse, kein Postfach. Eine c/o-Adresse
          eines Impressumsdienstes ist zulässig, solange dort auch förmlich zugestellt werden kann.
        </p>
      </section>

      <section className="legal-section">
        <h2>Kontakt</h2>
        <dl className="legal-list">
          <div><dt>E-Mail</dt><dd><Field value={legal.email} /></dd></div>
          <div><dt>Weiterer Kontaktweg</dt><dd><Field value={legal.secondContact} /></dd></div>
        </dl>
        <p className="legal-hint">
          § 5 DDG verlangt neben der E-Mail einen zweiten Weg, der eine schnelle Kontaktaufnahme
          ermöglicht — Telefonnummer oder ein tatsächlich beantwortetes Kontaktformular.
        </p>
      </section>

      {legal.vatId && (
        <section className="legal-section">
          <h2>Umsatzsteuer-Identifikationsnummer</h2>
          <p>{legal.vatId}</p>
        </section>
      )}

      <section className="legal-section">
        <h2>Verbraucherstreitbeilegung</h2>
        <p>
          Wir sind nicht bereit und nicht verpflichtet, an Streitbeilegungsverfahren vor einer
          Verbraucherschlichtungsstelle teilzunehmen.
        </p>
        <p className="legal-hint">
          Der früher übliche Absatz mit Link auf die EU-Online-Streitbeilegungsplattform ist entfallen —
          die Plattform wurde 2025 eingestellt. Vorlagen, die ihn noch enthalten, sind veraltet.
        </p>
      </section>

      <section className="legal-section">
        <h2>Haftung für Inhalte und Links</h2>
        <p>
          Für eigene Inhalte auf diesen Seiten sind wir nach den allgemeinen Gesetzen verantwortlich.
          Wir sind jedoch nicht verpflichtet, übermittelte oder gespeicherte fremde Informationen zu
          überwachen oder nach Umständen zu forschen, die auf eine rechtswidrige Tätigkeit hinweisen.
          Verpflichtungen zur Entfernung oder Sperrung der Nutzung von Informationen nach den
          allgemeinen Gesetzen bleiben unberührt. Eine diesbezügliche Haftung ist erst ab dem Zeitpunkt
          der Kenntnis einer konkreten Rechtsverletzung möglich. Bei Bekanntwerden entsprechender
          Rechtsverletzungen entfernen wir diese Inhalte umgehend.
        </p>
        <p>
          Unser Angebot enthält Links zu externen Websites Dritter, auf deren Inhalte wir keinen
          Einfluss haben. Für diese fremden Inhalte ist stets der jeweilige Anbieter verantwortlich.
        </p>
      </section>

      <section className="legal-section">
        <h2>Erzeugte Konfigurationsdateien</h2>
        <p>
          {siteName} erzeugt Textdateien für Counter-Strike 2 aus den Einstellungen, die Nutzerinnen und
          Nutzer selbst auswählen. Für den Einsatz dieser Dateien und die Einhaltung der Nutzungs- und
          Wettbewerbsbedingungen von Valve sowie einzelner Ligen und Turniere sind die Nutzenden selbst
          verantwortlich.
        </p>
      </section>

      <section className="legal-section">
        <h2>Marken- und Urheberrechte Dritter</h2>
        <p>
          {siteName} ist ein unabhängiges Community-Projekt und steht in keiner Verbindung zur Valve
          Corporation und wird von dieser weder unterstützt noch gesponsert. Counter-Strike, CS2 und
          zugehörige Marken sind Eigentum der Valve Corporation. Ihre Nennung erfolgt ausschließlich
          zur Beschreibung des Anwendungszwecks.
        </p>
      </section>
    </LegalShell>
  );
}
