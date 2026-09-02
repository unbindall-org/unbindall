/**
 * Drizzle wraps driver errors, so the PostgreSQL error code sits somewhere in
 * the cause chain rather than on the thrown error itself.
 */
export function isUniqueViolation(error: unknown) {
  let current = error;
  const visited = new Set<unknown>();
  while (current && typeof current === "object" && !visited.has(current)) {
    visited.add(current);
    if ("code" in current && current.code === "23505") return true;
    current = "cause" in current ? current.cause : undefined;
  }
  return false;
}
