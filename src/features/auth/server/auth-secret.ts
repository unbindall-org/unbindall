const developmentSecret = "local-development-secret-change-me-please";

export function getAuthSecret() {
  return process.env.AUTH_SECRET ?? developmentSecret;
}
