import { describe, expect, it } from "vitest";
import { pathForTab, tabForPath } from "./routes";

describe("workspace routes", () => {
  it("maps every addressable area both ways", () => {
    for (const path of ["/", "/community", "/community/new", "/papierkorb", "/register", "/einstellungen", "/moderation", "/admin"]) {
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

  it("keeps config tabs and unknown tabs on the workspace root", () => {
    expect(pathForTab({ kind: "config", configId: "abc" })).toBe("/");
    expect(pathForTab(null)).toBe("/");
  });
});
