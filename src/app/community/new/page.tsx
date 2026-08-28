import type { Metadata } from "next";
import { WorkspacePage } from "@/features/shell/server/workspace-page";

export const metadata: Metadata = { title: "Config teilen – Unbindall" };

export default function CommunityNewPostRoute() {
  return <WorkspacePage initialTab={{ kind: "community-post" }} />;
}
