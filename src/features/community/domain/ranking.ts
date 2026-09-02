/**
 * Trending without a background job: a decaying score computed directly in the
 * feed query. Adoptions weigh heaviest because adopting a config is the only
 * signal that costs the reader something.
 */
export const rankingWeights = { like: 1, adopt: 2, comment: 1.5 } as const;
export const rankingGravity = 1.5;
/** Two hours of grace so a fresh post is not buried by its own age. */
export const rankingOffsetHours = 2;

export function trendingScore(
  counts: { likeCount: number; adoptCount: number; commentCount: number },
  publishedAt: Date,
  now = new Date(),
) {
  const weighted =
    counts.likeCount * rankingWeights.like +
    counts.adoptCount * rankingWeights.adopt +
    counts.commentCount * rankingWeights.comment;
  const ageHours = Math.max(0, (now.getTime() - publishedAt.getTime()) / 3_600_000);
  return weighted / Math.pow(ageHours + rankingOffsetHours, rankingGravity);
}
