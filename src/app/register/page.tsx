import type { Metadata } from "next";
import { WorkspacePage } from "@/features/shell/server/workspace-page";

export const metadata: Metadata = {
  title: "Command-Register – Unbindall",
  description: "Alle CS2-Commands, die UNBINDALL kennt, mit Prüfstatus, Bereich und Einschränkungen.",
};

export default function CommandRegisterRoute() {
  return <WorkspacePage initialTab={{ kind: "commands" }} />;
}
