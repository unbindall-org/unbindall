import type { Metadata } from "next";
import { WorkspacePage } from "@/features/shell/server/workspace-page";

export const metadata: Metadata = {
  title: "Community – Unbindall",
  description: "Geteilte CS2-Setups entdecken und einzelne Parts übernehmen.",
  alternates: { canonical: "/community" },
};

export default function CommunityRoute() {
  return <WorkspacePage initialTab={{ kind: "community" }} />;
}
