import { describe, expect, it } from "vitest";
import { trendingScore } from "./ranking";

const now = new Date("2026-09-02T12:00:00Z");
const hoursAgo = (hours: number) => new Date(now.getTime() - hours * 3_600_000);

describe("trendingScore", () => {
  it("ranks a fresh post above an equally liked old one", () => {
    const counts = { likeCount: 10, adoptCount: 0, commentCount: 0 };
    expect(trendingScore(counts, hoursAgo(1), now)).toBeGreaterThan(trendingScore(counts, hoursAgo(72), now));
  });

  it("weighs an adoption higher than a like", () => {
    const liked = trendingScore({ likeCount: 2, adoptCount: 0, commentCount: 0 }, hoursAgo(4), now);
    const adopted = trendingScore({ likeCount: 0, adoptCount: 2, commentCount: 0 }, hoursAgo(4), now);
    expect(adopted).toBeGreaterThan(liked);
  });

  it("stays finite for a post published in the same moment", () => {
    expect(Number.isFinite(trendingScore({ likeCount: 1, adoptCount: 0, commentCount: 0 }, now, now))).toBe(true);
  });
});
