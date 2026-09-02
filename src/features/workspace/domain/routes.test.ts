import { describe, expect, it } from "vitest";
import { pathForTab, tabForPath } from "./routes";

describe("workspace routes", () => {
  it("maps every addressable area both ways", () => {
    for (const path of ["/", "/configs/new", "/community", "/community/new", "/community/meine", "/papierkorb", "/register", "/einstellungen", "/moderation", "/admin"]) {
      const tab = tabForPath(path);
      expect(tab, path).not.toBeNull();
      expect(pathForTab(tab)).toBe(path);
    }
  });

  it("ignores a trailing slash", () => {
    expect(tabForPath("/register/")).toEqual({ kind: "commands" });
  });

  it("returns null for a path the workspace does not own", () => {
    expect(tabForPath("/impressum")).toBeNull();
  });

  it("gives config tabs a reload-safe dynamic route", () => {
    expect(pathForTab({ kind: "config", configId: "abc/def" })).toBe("/configs/abc%2Fdef");
    expect(tabForPath("/configs/abc%2Fdef")).toEqual({ kind: "config", configId: "abc/def" });
  });

  it("does not treat the creation page as a config id", () => {
    expect(tabForPath("/configs/new")).toEqual({ kind: "new-config" });
  });

  it("gives shared posts and profiles reload-safe dynamic routes", () => {
    expect(pathForTab({ kind: "community-detail", slug: "faceit-autoexec-ab12cd" }))
      .toBe("/community/faceit-autoexec-ab12cd");
    expect(tabForPath("/community/faceit-autoexec-ab12cd"))
      .toEqual({ kind: "community-detail", slug: "faceit-autoexec-ab12cd" });
    expect(pathForTab({ kind: "profile", handle: "niko_b" })).toBe("/u/niko_b");
    expect(tabForPath("/u/niko_b")).toEqual({ kind: "profile", handle: "niko_b" });
  });

  it("does not treat the community sub-pages as post slugs", () => {
    expect(tabForPath("/community/new")).toEqual({ kind: "community-post" });
    expect(tabForPath("/community/meine")).toEqual({ kind: "community-mine" });
  });

  it("keeps an empty workspace on the root", () => {
    expect(pathForTab(null)).toBe("/");
  });
});
