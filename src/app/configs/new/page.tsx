import type { Metadata } from "next";
import { WorkspacePage } from "@/features/shell/server/workspace-page";

export const metadata: Metadata = { title: "Neue Config – Unbindall" };

export default function NewConfigRoute() {
  return <WorkspacePage initialTab={{ kind: "new-config" }} />;
}
