import { authSecret } from "@/features/runtime/server/environment";

export function getAuthSecret() {
  return authSecret();
}
