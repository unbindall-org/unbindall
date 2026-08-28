import { describe, expect, it } from "vitest";
import { hasRole } from "./roles";

describe("user roles", () => {
  it("lets platform admins enter both team areas", () => {
    expect(hasRole("platform_admin", "platform_admin")).toBe(true);
    expect(hasRole("platform_admin", "moderator")).toBe(true);
  });

  it("keeps moderator and user permissions one-way", () => {
    expect(hasRole("moderator", "moderator")).toBe(true);
    expect(hasRole("moderator", "platform_admin")).toBe(false);
    expect(hasRole("user", "moderator")).toBe(false);
  });
});

