import type { Metadata } from "next";
import { NewConfigPage } from "@/features/generator/components/new-config-page";

export const metadata: Metadata = {
  title: "Neue Config – Unbindall",
};

export default function NewPage() {
  return <NewConfigPage />;
}
