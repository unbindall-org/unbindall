import type { Metadata } from "next";
import { WorkspacePage } from "@/features/shell/server/workspace-page";

export const metadata: Metadata = { title: "Papierkorb – Unbindall" };

export default function TrashRoute() {
  return <WorkspacePage initialTab={{ kind: "trash" }} />;
}
