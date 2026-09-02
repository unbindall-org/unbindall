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
  communityPublishAccount: { limit: 10, windowMs: 60 * 60_000 },
  communityPublishIp: { limit: 20, windowMs: 60 * 60_000 },
  communityCommentAccount: { limit: 30, windowMs: 15 * 60_000 },
  communityCommentIp: { limit: 60, windowMs: 15 * 60_000 },
  communityReactionAccount: { limit: 120, windowMs: 60_000 },
  communityReportAccount: { limit: 20, windowMs: 60 * 60_000 },
  communityReadIp: { limit: 300, windowMs: 60_000 },
  handleChangeAccount: { limit: 3, windowMs: 24 * 60 * 60_000 },
} as const;

export type RateLimitPolicyName = keyof typeof rateLimitPolicies;
