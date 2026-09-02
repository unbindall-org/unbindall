import { describe, expect, it } from "vitest";
import { configTypesOf, createSlug, normalizeTags, slugifyTitle } from "./post";

describe("normalizeTags", () => {
  it("lowercases, deduplicates and caps at six", () => {
    expect(normalizeTags(["Crosshair", "#RADAR", "crosshair", "a", "fps", "aim", "esl", "eco", "utility"]))
      .toEqual(["crosshair", "radar", "fps", "aim", "esl", "eco"]);
  });

  it("replaces separators without leaving stray dashes", () => {
    expect(normalizeTags(["low end", "  spaced  ", "--weird--"])).toEqual(["low-end", "spaced", "weird"]);
  });

  it("drops fragments shorter than two characters", () => {
    expect(normalizeTags(["a", "-", ""])).toEqual([]);
  });
});

describe("slugifyTitle", () => {
  it("transliterates umlauts and strips punctuation", () => {
    expect(slugifyTitle("Föhns Übung: 100% Aim!")).toBe("foehns-uebung-100-aim");
  });

  it("falls back for a title without usable characters", () => {
    expect(slugifyTitle("!!!")).toBe("config");
  });

  it("keeps the random suffix so identical titles never collide", () => {
    expect(createSlug("Faceit Autoexec", "ab12cd")).toBe("faceit-autoexec-ab12cd");
  });
});

describe("configTypesOf", () => {
  it("collects each type once", () => {
    expect(configTypesOf([
      { configType: "matchmaking" },
      { configType: "practice" },
      { configType: "matchmaking" },
    ])).toEqual(["matchmaking", "practice"]);
  });
});
