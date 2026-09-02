import type { Metadata } from "next";
import { WorkspacePage } from "@/features/shell/server/workspace-page";

export const metadata: Metadata = { alternates: { canonical: "/" } };

export default function Home() {
  return <WorkspacePage />;
}
