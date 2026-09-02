import type { Instrumentation } from "next";
import { validateProductionEnvironment } from "@/features/runtime/server/environment";
import { captureException, pathWithoutQuery } from "@/observability/server";

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  try {
    validateProductionEnvironment();
  } catch (error) {
    await captureException("server.startup_failed", error);
    throw error;
  }
}

export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  await captureException("next.request_error", error, {
    method: request.method,
    path: pathWithoutQuery(request.path),
    routerKind: context.routerKind,
    routePath: context.routePath,
    routeType: context.routeType,
    renderSource: context.renderSource,
    revalidateReason: context.revalidateReason,
  });
};
