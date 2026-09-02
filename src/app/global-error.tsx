"use client";

import "./globals.css";
import { ErrorScreen } from "@/components/error-screen";

export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <html lang="de">
      <head><title>Fehler – Unbindall</title></head>
      <body>
        <ErrorScreen error={error} retry={retry} source="global-boundary" />
      </body>
    </html>
  );
}
