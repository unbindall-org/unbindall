import type { Metadata } from "next";
import { WorkspacePage } from "@/features/shell/server/workspace-page";

export const metadata: Metadata = { title: "Einstellungen – Unbindall" };

export default function SettingsRoute() {
  return <WorkspacePage initialTab={{ kind: "settings" }} />;
}
