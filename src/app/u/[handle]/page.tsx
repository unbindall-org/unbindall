import type { Metadata } from "next";
import { WorkspacePage } from "@/features/shell/server/workspace-page";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ handle: string }>;
}): Promise<Metadata> {
  const { handle } = await params;
  return {
    title: `@${handle} – Unbindall`,
    description: `Geteilte CS2-Setups von @${handle}.`,
  };
}

export default async function CommunityProfileRoute({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  return <WorkspacePage initialTab={{ kind: "profile", handle: handle.toLowerCase() }} />;
}
