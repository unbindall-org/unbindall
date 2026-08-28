import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/logo";
import { getServerLocale } from "@/i18n/server";
import { legal, isPlaceholder } from "../site";

/** Hebt unersetzte Platzhalter sichtbar hervor. */
export function Field({ value }: { value: string | null }) {
  if (!value) return null;
  return isPlaceholder(value) ? <span className="legal-placeholder">{value}</span> : <>{value}</>;
}

export async function LegalShell({
  eyebrow,
  title,
  lead,
  children,
}: {
  eyebrow: string;
  title: string;
  lead: string;
  children: React.ReactNode;
}) {
  const locale = await getServerLocale();

  return (
    <div className="legal-shell">
      <header className="legal-topbar">
        <Link href="/" className="brand legal-brand">
          <div className="brand-symbol"><Logo size={34} /></div>
          <div className="brand-text"><strong>UNBINDALL</strong><span>CS2 AUTOEXEC</span></div>
        </Link>
        <Link href="/" className="legal-back"><ArrowLeft size={16} />Zum Generator</Link>
      </header>

      <main className="legal-main">
        {locale === "en" && (
          <p className="legal-locale-note">
            This page is only available in German. The German version is the legally binding one.
          </p>
        )}

        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="legal-lead">{lead}</p>

        <div className="legal-body">{children}</div>

        <footer className="legal-foot">
          <span>Stand: {legal.lastUpdated}</span>
          <nav>
            <Link href="/impressum">Impressum</Link>
            <Link href="/datenschutz">Datenschutz</Link>
          </nav>
        </footer>
      </main>
    </div>
  );
}
