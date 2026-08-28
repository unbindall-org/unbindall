/** Stabiler Dateiname für den clientseitig aus der tRPC-Antwort erzeugten Export. */
export function accountExportFilename(now = new Date()) {
  return `unbindall-export-${now.toISOString().slice(0, 10)}.json`;
}

export const accountExportFormat = "unbindall.account-export";
export const accountExportFormatVersion = 2;
