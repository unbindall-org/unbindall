import type { Metadata } from "next";
import { WorkspacePage } from "@/features/shell/server/workspace-page";

export const metadata: Metadata = { title: "Moderation – Unbindall" };

export default function ModerationRoute() {
  return <WorkspacePage initialTab={{ kind: "moderation" }} requiredRole="moderator" />;
}

