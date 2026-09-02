import { describe, expect, it } from "vitest";
import {
  canChangeHandle,
  handleChangeCooldownDays,
  handleSchema,
  initialsFor,
  isReservedHandle,
  toPublicAuthor,
} from "./identity";

describe("handleSchema", () => {
  it("accepts a normal handle and lowercases it", () => {
    expect(handleSchema.parse("Niko_B")).toBe("niko_b");
  });

  it("rejects handles that are too short, start with a digit, or carry spaces", () => {
    for (const value of ["ab", "1niko", "niko b", "niko!", "n".repeat(25)]) {
      expect(handleSchema.safeParse(value).success).toBe(false);
    }
  });

  it("rejects reserved handles", () => {
    expect(isReservedHandle("Moderator")).toBe(true);
    expect(handleSchema.safeParse("admin").success).toBe(false);
  });
});

describe("handle cooldown", () => {
  it("allows the first change and blocks a second one inside the window", () => {
    expect(canChangeHandle(null)).toBe(true);
    const now = new Date("2026-09-02T12:00:00Z");
    const recent = new Date(now.getTime() - 3 * 24 * 3600_000);
    expect(canChangeHandle(recent, now)).toBe(false);

    const old = new Date(now.getTime() - (handleChangeCooldownDays + 1) * 24 * 3600_000);
    expect(canChangeHandle(old, now)).toBe(true);
  });
});

describe("toPublicAuthor", () => {
  it("never leaks the login name when a public identity exists", () => {
    const author = toPublicAuthor({ handle: "niko_b", displayName: "niko", name: "Real Name", image: null });
    expect(author).toEqual({ handle: "niko_b", displayName: "niko", image: null });
  });

  it("degrades to a placeholder for a deleted account", () => {
    expect(toPublicAuthor({ handle: null, displayName: null, name: "Real Name", image: null }).handle)
      .toBe("geloescht");
  });

  it("builds initials from the display name", () => {
    expect(initialsFor({ displayName: "Niko Bellic", handle: "niko_b" })).toBe("NB");
    expect(initialsFor({ displayName: "", handle: "niko_b" })).toBe("NI");
  });
});
