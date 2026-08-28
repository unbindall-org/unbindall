import type { Metadata } from "next";
import { WorkspacePage } from "@/features/shell/server/workspace-page";

export const metadata: Metadata = { title: "Administration – Unbindall" };

export default function AdminRoute() {
  return <WorkspacePage initialTab={{ kind: "admin" }} requiredRole="platform_admin" />;
}

