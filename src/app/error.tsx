"use client";

import { ErrorScreen } from "@/components/error-screen";

export default function ErrorPage({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return <ErrorScreen error={error} retry={retry} source="route-boundary" />;
}
