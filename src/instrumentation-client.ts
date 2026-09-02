import { captureClientException } from "@/observability/client";

try {
  window.addEventListener("error", (event) => {
    captureClientException(event.error ?? event.message, "window.error");
  });

  window.addEventListener("unhandledrejection", (event) => {
    captureClientException(event.reason, "unhandled-rejection");
  });
} catch {
  // Instrumentation is deliberately isolated from application startup.
}
