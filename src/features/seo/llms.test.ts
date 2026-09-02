import { describe, expect, it } from "vitest";
import { siteUrl } from "@/features/legal/site";
import { buildLlmsTxt } from "./llms";

const document = buildLlmsTxt();
const lines = document.split("\n");

describe("llms.txt", () => {
  it("follows the required document shape: H1 title, blockquote summary, then H2 sections", () => {
    expect(lines[0]).toBe("# Unbindall");
    expect(lines[1]).toBe("");
    expect(lines[2]).toMatch(/^> \S/);
    expect(document.endsWith("\n")).toBe(true);

    const headings = lines.filter((line) => line.startsWith("#"));
    expect(headings[0]).toBe("# Unbindall");
    expect(headings.slice(1).every((heading) => heading.startsWith("## "))).toBe(true);

    // Detail sections precede the first H2 and must not contain headings themselves.
    const firstSection = lines.findIndex((line) => line.startsWith("## "));
    expect(firstSection).toBeGreaterThan(3);
  });

  it("keeps skippable material in the trailing Optional section", () => {
    const sections = lines.filter((line) => line.startsWith("## "));
    expect(sections.at(-1)).toBe("## Optional");
    expect(sections).toContain("## Documentation");
  });

  it("lists only absolute links to the site or the repository", () => {
    const links = [...document.matchAll(/^- \[([^\]]+)\]\(([^)]+)\)/gm)];
    expect(links.length).toBeGreaterThan(5);

    for (const [, title, url] of links) {
      expect(title.trim()).not.toBe("");
      expect(url).toMatch(
        new RegExp(`^(${siteUrl}|https://github\\.com/|https://raw\\.githubusercontent\\.com/)`),
      );
    }
  });
});
