import type { Metadata } from "next";
import { WorkspacePage } from "@/features/shell/server/workspace-page";

export const metadata: Metadata = { title: "Config – Unbindall" };

export default async function ConfigRoute({
  params,
}: {
  params: Promise<{ configId: string }>;
}) {
  const { configId } = await params;
  return <WorkspacePage initialTab={{ kind: "config", configId }} />;
}
