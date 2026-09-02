import type { Metadata } from "next";
import { WorkspacePage } from "@/features/shell/server/workspace-page";

export const metadata: Metadata = {
  title: "Meine Beiträge – Unbindall",
  description: "Eigene geteilte Configs verwalten, aktualisieren und zurückziehen.",
};

export default function CommunityMineRoute() {
  return <WorkspacePage initialTab={{ kind: "community-mine" }} />;
}
