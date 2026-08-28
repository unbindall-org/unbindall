import { validateProductionEnvironment } from "@/features/runtime/server/environment";

export function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") validateProductionEnvironment();
}

