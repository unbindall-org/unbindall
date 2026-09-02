export const rateLimitPolicies = {
  authEndpointIp: { limit: 60, windowMs: 15 * 60_000 },
  credentialsLoginIp: { limit: 20, windowMs: 15 * 60_000 },
  credentialsLoginAccount: { limit: 10, windowMs: 15 * 60_000 },
  registrationIp: { limit: 5, windowMs: 60 * 60_000 },
  steamStartIp: { limit: 20, windowMs: 15 * 60_000 },
  steamCallbackIp: { limit: 20, windowMs: 15 * 60_000 },
  accountDeleteAccount: { limit: 5, windowMs: 60 * 60_000 },
  accountDeleteIp: { limit: 10, windowMs: 60 * 60_000 },
  accountExportAccount: { limit: 5, windowMs: 60 * 60_000 },
  configMutationAccount: { limit: 120, windowMs: 60_000 },
  configMutationIp: { limit: 240, windowMs: 60_000 },
  clientErrorIp: { limit: 30, windowMs: 60_000 },
} as const;

export type RateLimitPolicyName = keyof typeof rateLimitPolicies;

