import Link from "next/link";
import { House, SearchX } from "lucide-react";
import { getServerLocale } from "@/i18n/server";

export default async function NotFound() {
  const locale = await getServerLocale();
  const english = locale === "en";

  return (
    <main className="status-screen">
      <div className="status-card">
        <div className="status-icon" aria-hidden="true"><SearchX /></div>
        <p className="eyebrow">404</p>
        <h1>{english ? "Page not found." : "Seite nicht gefunden."}</h1>
        <p className="status-copy">
          {english
            ? "The requested page does not exist or has been moved."
            : "Die angeforderte Seite existiert nicht oder wurde verschoben."}
        </p>
        <div className="status-actions">
          <Link href="/" className="status-primary">
            <House size={16} />{english ? "Open generator" : "Zum Generator"}
          </Link>
        </div>
      </div>
    </main>
  );
}
