import type { Metadata } from "next";
import { auth } from "@/auth";
import { WorkspacePage } from "@/features/shell/server/workspace-page";
import { appRouter } from "@/trpc/router";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  try {
    const caller = appRouter.createCaller({ session: await auth() });
    const { post } = await caller.community.bySlug({ slug });
    return {
      title: `${post.title} – Unbindall`,
      description: post.summary.slice(0, 200),
      // Hidden and unlisted posts stay reachable by link but out of indexes.
      robots: post.visibility === "public" && post.status === "published" ? undefined : { index: false },
    };
  } catch {
    return { title: "Beitrag – Unbindall" };
  }
}

export default async function CommunityPostRoute({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <WorkspacePage initialTab={{ kind: "community-detail", slug }} />;
}
