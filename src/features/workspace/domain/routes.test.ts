import { describe, expect, it } from "vitest";
import { pathForTab, tabForPath } from "./routes";

describe("workspace routes", () => {
  it("maps every addressable area both ways", () => {
    for (const path of ["/", "/configs/new", "/community", "/community/new", "/papierkorb", "/register", "/einstellungen", "/moderation", "/admin"]) {
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

  it("keeps an empty workspace on the root", () => {
    expect(pathForTab(null)).toBe("/");
  });
});
