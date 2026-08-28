import type { Metadata } from "next";
import { Field, LegalShell } from "@/features/legal/components/legal-shell";
import { legal, siteName } from "@/features/legal/site";

export const metadata: Metadata = {
  title: `Datenschutzerklärung — ${siteName}`,
  description: "Informationen zur Verarbeitung personenbezogener Daten nach Art. 13 DSGVO.",
  robots: { index: false, follow: true },
};

export default function DatenschutzPage() {
  return (
    <LegalShell
      eyebrow="RECHTLICHES"
      title="Datenschutzerklärung"
      lead="Informationen zur Verarbeitung personenbezogener Daten nach Art. 13 DSGVO."
    >
      <section className="legal-section">
        <h2>1. Verantwortlicher</h2>
        <address className="legal-address">
          <Field value={legal.operator} />
          {legal.addressLines.map((line) => <span key={line}><Field value={line} /></span>)}
          <span>E-Mail: <Field value={legal.email} /></span>
        </address>
        <p>
          Ein Datenschutzbeauftragter ist nicht bestellt; die gesetzlichen Voraussetzungen dafür liegen
          nicht vor.
        </p>
      </section>

      <section className="legal-section">
        <h2>2. Grundsatz</h2>
        <p>
          {siteName} verarbeitet so wenig Daten wie möglich. Der Generator ist ohne Account nutzbar; in
          diesem Fall verlässt deine Konfiguration deinen Browser nicht. Es werden keine Analyse-,
          Tracking- oder Werbedienste eingesetzt, es findet kein Profiling statt und es werden keine
          Daten zu Werbezwecken an Dritte weitergegeben. Nur wenn du einen Social-Login auswählst, wird
          dein Browser zur Authentifizierung mit Steam beziehungsweise Discord verbunden. Aus demselben Grund gibt es auf dieser Website
          kein Cookie-Banner: Es werden ausschließlich technisch erforderliche Cookies und
          Speicherzugriffe verwendet, für die nach § 25 Abs. 2 Nr. 2 TDDDG keine Einwilligung nötig ist.
        </p>
      </section>

      <section className="legal-section">
        <h2>3. Aufruf der Website und Server-Logfiles</h2>
        <p>
          Beim Aufruf der Website übermittelt dein Browser technisch notwendige Daten, die unser
          Hosting-Anbieter in Logfiles verarbeitet: IP-Adresse, Datum und Uhrzeit, angefragte Ressource,
          Statuscode, übertragene Datenmenge, Referrer und User-Agent.
        </p>
        <dl className="legal-list">
          <div><dt>Zweck</dt><dd>Bereitstellung, Stabilität und Sicherheit des Dienstes</dd></div>
          <div><dt>Rechtsgrundlage</dt><dd>Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse am sicheren Betrieb)</dd></div>
          <div><dt>Auftragsverarbeiter</dt><dd><Field value={legal.hostingProvider} /></dd></div>
          <div><dt>Speicherdauer</dt><dd className="legal-placeholder">PLATZHALTER: tatsächliche Aufbewahrungsdauer des Hosters eintragen, üblich sind 7 bis 30 Tage</dd></div>
        </dl>
      </section>

      <section className="legal-section">
        <h2>4. Nutzung ohne Account</h2>
        <p>
          Deine Konfiguration wird während der Bearbeitung im lokalen Speicher deines Browsers
          (localStorage) unter den Schlüsseln <code>unbindall:draft</code> und{" "}
          <code>unbindall:draft-meta</code> abgelegt, damit sie beim nächsten Besuch noch vorhanden ist.
          Diese Daten verbleiben auf deinem Gerät und werden nicht an uns übertragen. Du kannst sie
          jederzeit über die Website-Einstellungen deines Browsers löschen.
        </p>
        <p>
          Auch das Herunterladen und Kopieren der erzeugten <code>autoexec.cfg</code> sowie der Import
          einer bestehenden CFG-Datei finden vollständig in deinem Browser statt. Importierte Dateien
          werden nicht hochgeladen.
        </p>
      </section>

      <section className="legal-section">
        <h2>5. Benutzerkonto</h2>
        <p>
          Für die Cloud-Speicherung kannst du freiwillig ein Konto anlegen. Dabei verarbeiten wir:
        </p>
        <dl className="legal-list">
          <div><dt>Daten</dt><dd>Je nach Login: E-Mail-Adresse, Anzeigename, Profilbild-URL, externe Steam- oder Discord-ID, Passwort ausschließlich als kryptografischer Hash (bcrypt), Zeitpunkt der Erstellung und der letzten Änderung</dd></div>
          <div><dt>Zweck</dt><dd>Bereitstellung des Kontos, Authentifizierung, Zuordnung gespeicherter Konfigurationen</dd></div>
          <div><dt>Rechtsgrundlage</dt><dd>Art. 6 Abs. 1 lit. b DSGVO (Erfüllung des Nutzungsvertrags)</dd></div>
          <div><dt>Speicherdauer</dt><dd>bis zur Löschung des Kontos durch dich</dd></div>
        </dl>
        <p>
          Dein Passwort wird zu keinem Zeitpunkt im Klartext gespeichert und ist auch für uns nicht
          einsehbar.
        </p>
        <p>
          Wählst du &bdquo;Mit Steam anmelden&ldquo; oder &bdquo;Mit Discord anmelden&ldquo;, wirst du zum jeweiligen
          Anbieter weitergeleitet. Dieser erhält dabei technisch notwendige Verbindungsdaten und die
          Information, dass du dich bei {siteName} anmelden möchtest. Steam übermittelt uns Steam-ID,
          Anzeigename und Profilbild-URL; Discord übermittelt Discord-ID, Anzeigename, Profilbild-URL
          und – soweit freigegeben – E-Mail-Adresse. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO.
          Für die Verarbeitung beim Anbieter gelten zusätzlich dessen Datenschutzhinweise.
        </p>
      </section>

      <section className="legal-section">
        <h2>6. Gespeicherte Konfigurationen</h2>
        <p>
          Speicherst du eine Konfiguration in deinem Konto, legen wir ihren Namen, die gewählten
          Einstellungen und den erzeugten Dateiinhalt in unserer Datenbank ab, verknüpft mit deinem
          Konto. Diese Inhalte sind nicht öffentlich und werden ausschließlich dir angezeigt.
          Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO. Die Speicherung endet, wenn du die
          Konfiguration oder dein Konto löschst.
        </p>
      </section>

      <section className="legal-section">
        <h2>7. Cookies und Speicherzugriffe</h2>
        <table className="legal-table">
          <thead>
            <tr><th>Name</th><th>Zweck</th><th>Speicherort und Dauer</th></tr>
          </thead>
          <tbody>
            <tr>
              <td><code>authjs.session-token</code> (über HTTPS: <code>__Secure-authjs.session-token</code>)</td>
              <td>Anmeldestatus (nur bei bestehendem Konto gesetzt)</td>
              <td>Cookie, bis zum Abmelden bzw. Ablauf der Sitzung</td>
            </tr>
            <tr>
              <td><code>steam-openid-state</code></td>
              <td>Schützt einen gestarteten Steam-Login vor fremden oder manipulierten Antworten</td>
              <td>HttpOnly-Cookie, höchstens 10 Minuten beziehungsweise bis zum Login-Callback</td>
            </tr>
            <tr>
              <td><code>unbindall-locale</code></td>
              <td>Speichert deine Sprachwahl</td>
              <td>Cookie</td>
            </tr>
            <tr>
              <td><code>unbindall:draft</code>, <code>unbindall:draft-meta</code></td>
              <td>Erhält deinen unfertigen Entwurf im Browser</td>
              <td>localStorage, bis du ihn löschst</td>
            </tr>
            <tr>
              <td><code>unbindall:locale</code></td>
              <td>Sprachwahl, gespiegelt für die Anzeige ohne Serveranfrage</td>
              <td>localStorage, bis du ihn löschst</td>
            </tr>
          </tbody>
        </table>
        <p>
          Alle genannten Einträge sind technisch erforderlich, um die von dir ausdrücklich gewünschten
          Funktionen bereitzustellen. Eine Einwilligung ist dafür nach § 25 Abs. 2 Nr. 2 TDDDG nicht
          erforderlich.
        </p>
      </section>

      <section className="legal-section">
        <h2>8. Schriftarten</h2>
        <p>
          Die verwendete Schriftart wird von unserem eigenen Server ausgeliefert. Beim Besuch dieser
          Website wird keine Verbindung zu Google Fonts oder einem anderen externen Schriftdienst
          aufgebaut; es wird insbesondere keine IP-Adresse an Dritte übermittelt.
        </p>
      </section>

      <section className="legal-section">
        <h2>9. Empfänger und Auftragsverarbeiter</h2>
        <p>
          Wir geben personenbezogene Daten nur an sorgfältig ausgewählte Dienstleister weiter, die für
          uns nach Art. 28 DSGVO als Auftragsverarbeiter tätig sind und vertraglich an unsere Weisungen
          gebunden sind:
        </p>
        <dl className="legal-list">
          <div><dt>Hosting</dt><dd><Field value={legal.hostingProvider} /></dd></div>
          <div><dt>Datenbank</dt><dd><Field value={legal.databaseProvider} /></dd></div>
          {legal.emailProvider && <div><dt>E-Mail-Versand</dt><dd>{legal.emailProvider}</dd></div>}
          <div><dt>Optionaler Social-Login</dt><dd>Valve Corporation (Steam) beziehungsweise Discord Inc.; nur wenn du den jeweiligen Login auswählst</dd></div>
        </dl>
        <p className="legal-placeholder">
          PLATZHALTER: Sofern Daten außerhalb der EU/des EWR verarbeitet werden, hier die Rechtsgrundlage
          der Übermittlung ergänzen — Angemessenheitsbeschluss, Standardvertragsklauseln nach Art. 46
          DSGVO oder Zertifizierung des Anbieters. Vor dem Livegang beim jeweiligen Anbieter prüfen und
          den Auftragsverarbeitungsvertrag abschließen.
        </p>
      </section>

      <section className="legal-section">
        <h2>10. Speicherdauer und Löschung</h2>
        <p>
          Wir speichern personenbezogene Daten nur so lange, wie es für die genannten Zwecke erforderlich
          ist oder gesetzliche Aufbewahrungspflichten bestehen. Löschst du dein Konto, werden die
          zugehörigen Kontodaten, alle gespeicherten Konfigurationen und alle Sitzungen unmittelbar und
          vollständig aus unserer Datenbank entfernt.
        </p>
      </section>

      <section className="legal-section">
        <h2>11. Deine Rechte</h2>
        <p>Dir stehen gegenüber uns folgende Rechte hinsichtlich deiner personenbezogenen Daten zu:</p>
        <ul className="legal-bullets">
          <li>Auskunft über die verarbeiteten Daten (Art. 15 DSGVO)</li>
          <li>Berichtigung unrichtiger Daten (Art. 16 DSGVO)</li>
          <li>Löschung (Art. 17 DSGVO)</li>
          <li>Einschränkung der Verarbeitung (Art. 18 DSGVO)</li>
          <li>Datenübertragbarkeit in einem gängigen, maschinenlesbaren Format (Art. 20 DSGVO)</li>
          <li>Widerspruch gegen Verarbeitungen auf Grundlage berechtigter Interessen (Art. 21 DSGVO)</li>
        </ul>
        <p>
          Zwei dieser Rechte kannst du direkt in der Anwendung ausüben: Unter &bdquo;Account &amp; Daten&ldquo; im
          Benutzermenü lädst du sämtliche zu deinem Konto gespeicherten Daten als JSON-Datei herunter
          oder löschst dein Konto vollständig. Für alle übrigen Anliegen genügt eine formlose Nachricht
          an <Field value={legal.email} />.
        </p>
      </section>

      <section className="legal-section">
        <h2>12. Beschwerderecht</h2>
        <p>
          Unabhängig davon steht dir ein Beschwerderecht bei einer Datenschutz-Aufsichtsbehörde zu
          (Art. 77 DSGVO). Für uns zuständig ist:
        </p>
        <p><Field value={legal.supervisoryAuthority} /></p>
      </section>

      <section className="legal-section">
        <h2>13. Änderungen dieser Erklärung</h2>
        <p>
          Wir passen diese Datenschutzerklärung an, sobald sich die Verarbeitung ändert — etwa wenn
          neue Funktionen hinzukommen. Es gilt die jeweils hier veröffentlichte Fassung.
        </p>
      </section>
    </LegalShell>
  );
}
