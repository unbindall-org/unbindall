"use client";

import { useEffect } from "react";
import { CircleAlert, House, RotateCcw } from "lucide-react";
import Link from "next/link";
import { captureClientException, type ClientErrorSource } from "@/observability/client";

export function ErrorScreen({
  error,
  retry,
  source,
}: {
  error: Error & { digest?: string };
  retry: () => void;
  source: Extract<ClientErrorSource, "route-boundary" | "global-boundary">;
}) {
  useEffect(() => {
    // Server-rendering errors already pass through instrumentation.onRequestError.
    if (!error.digest) captureClientException(error, source);
  }, [error, source]);

  return (
    <main className="status-screen">
      <div className="status-card" role="alert">
        <div className="status-icon" aria-hidden="true"><CircleAlert /></div>
        <p className="eyebrow">UNERWARTETER FEHLER</p>
        <h1>Das hat nicht funktioniert.</h1>
        <p className="status-copy">
          Der Fehler wurde protokolliert. Versuche es noch einmal oder kehre zum Generator zurück.
        </p>
        {error.digest ? <p className="status-reference">Referenz: {error.digest}</p> : null}
        <div className="status-actions">
          <button type="button" className="status-primary" onClick={retry}>
            <RotateCcw size={16} />Erneut versuchen
          </button>
          <Link href="/" className="status-secondary"><House size={16} />Zum Generator</Link>
        </div>
      </div>
    </main>
  );
}
