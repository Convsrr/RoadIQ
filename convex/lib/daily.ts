import type { MutationCtx } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";
import { hash } from "./progression";

const DAILY_CHALLENGE_COUNT = 5;

export function assertDateKey(date: string): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00Z`))) {
    throw new Error("INVALID_DAILY_DATE");
  }
}

export async function ensureDailyChallenge(
  ctx: MutationCtx,
  date: string,
  now = Date.now(),
): Promise<Doc<"dailyChallenges">> {
  assertDateKey(date);
  const existing = await ctx.db
    .query("dailyChallenges")
    .withIndex("by_date", (q) => q.eq("date", date))
    .unique();
  if (existing) return existing;

  const published = await ctx.db
    .query("challenges")
    .withIndex("by_status_and_published_at", (q) => q.eq("status", "published"))
    .take(10_000);
  const challengeIds = [...published]
    .sort((a, b) => hash(`${date}:${a.stableId}`) - hash(`${date}:${b.stableId}`))
    .slice(0, DAILY_CHALLENGE_COUNT)
    .map((challenge) => challenge._id);
  if (challengeIds.length < DAILY_CHALLENGE_COUNT) throw new Error("DAILY_CHALLENGES_UNAVAILABLE");

  const dailyId = await ctx.db.insert("dailyChallenges", { date, challengeIds, createdAt: now });
  return (await ctx.db.get(dailyId))!;
}

export async function completedDailyChallengeIds(
  ctx: MutationCtx,
  userId: Id<"users">,
  daily: Doc<"dailyChallenges">,
): Promise<Id<"challenges">[]> {
  const completed = await Promise.all(daily.challengeIds.map(async (challengeId) => {
    const response = await ctx.db
      .query("challengeResponses")
      .withIndex("by_user_id_and_challenge_id", (q) => q.eq("userId", userId).eq("challengeId", challengeId))
      .unique();
    return response ? challengeId : null;
  }));
  return completed.filter((challengeId): challengeId is Id<"challenges"> => challengeId !== null);
}
