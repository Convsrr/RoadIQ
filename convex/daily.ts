import { v } from "convex/values";
import { mutation, query, type QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { toPublicChallenge } from "./challenges";
import { awardEligibleAchievements } from "./lib/achievements";
import { completedDailyChallengeIds, ensureDailyChallenge, assertDateKey } from "./lib/daily";
import { hash, DAILY_COMPLETION_XP } from "./lib/progression";
import { ensureAnonymousPlayer, getUserBySession, refreshPlayerStats } from "./lib/players";
import { achievementValidator, publicChallengeValidator } from "./lib/validators";

const dailyResultValidator = v.object({
  daily: v.object({
    date: v.string(),
    completion: v.object({ date: v.string(), completedAt: v.string(), xpAwarded: v.number() }),
    currentStreak: v.number(),
    longestStreak: v.number(),
    awardedNow: v.boolean(),
    newAchievements: v.array(achievementValidator),
  }),
});

async function dailyChallengeDocs(
  ctx: QueryCtx,
  date: string,
): Promise<Doc<"challenges">[]> {
  const daily = await ctx.db
    .query("dailyChallenges")
    .withIndex("by_date", (q) => q.eq("date", date))
    .unique();
  if (daily) {
    const challenges = await Promise.all(daily.challengeIds.map((challengeId) => ctx.db.get(challengeId)));
    return challenges.filter((challenge): challenge is Doc<"challenges"> => Boolean(challenge));
  }
  const published = await ctx.db
    .query("challenges")
    .withIndex("by_status_and_published_at", (q) => q.eq("status", "published"))
    .take(10_000);
  return [...published]
    .sort((a, b) => hash(`${date}:${a.stableId}`) - hash(`${date}:${b.stableId}`))
    .slice(0, 5);
}

async function completedIdsForQuery(
  ctx: QueryCtx,
  userId: Id<"users"> | null,
  challenges: Doc<"challenges">[],
): Promise<Id<"challenges">[]> {
  if (!userId) return [];
  const completed = await Promise.all(challenges.map(async (challenge) => {
    const response = await ctx.db
      .query("challengeResponses")
      .withIndex("by_user_id_and_challenge_id", (q) => q.eq("userId", userId).eq("challengeId", challenge._id))
      .unique();
    return response ? challenge._id : null;
  }));
  return completed.filter((id): id is Id<"challenges"> => id !== null);
}

export const getDaily = query({
  args: { sessionId: v.string(), date: v.string() },
  returns: v.object({
    daily: v.object({
      date: v.string(),
      challengeIds: v.array(v.string()),
      challenges: v.array(publicChallengeValidator),
      completedChallengeIds: v.array(v.string()),
      completed: v.boolean(),
      bonusAwarded: v.boolean(),
    }),
  }),
  handler: async (ctx, args) => {
    assertDateKey(args.date);
    const [user, challenges] = await Promise.all([
      getUserBySession(ctx, args.sessionId),
      dailyChallengeDocs(ctx, args.date),
    ]);
    const completedIds = await completedIdsForQuery(ctx, user?._id ?? null, challenges);
    const completion = user
      ? await ctx.db
          .query("dailyCompletions")
          .withIndex("by_user_id_and_date", (q) => q.eq("userId", user._id).eq("date", args.date))
          .unique()
      : null;
    return {
      daily: {
        date: args.date,
        challengeIds: challenges.map((challenge) => challenge.stableId),
        challenges: await Promise.all(challenges.map((challenge) => toPublicChallenge(ctx, challenge))),
        completedChallengeIds: completedIds.map((id) => challenges.find((challenge) => challenge._id === id)?.stableId ?? "").filter(Boolean),
        completed: challenges.length > 0 && completedIds.length === challenges.length,
        bonusAwarded: Boolean(completion),
      },
    };
  },
});

export const completeDaily = mutation({
  args: { sessionId: v.string(), date: v.string() },
  returns: dailyResultValidator,
  handler: async (ctx, args) => {
    const user = await ensureAnonymousPlayer(ctx, args.sessionId);
    const now = Date.now();
    const daily = await ensureDailyChallenge(ctx, args.date, now);
    const completedIds = await completedDailyChallengeIds(ctx, user._id, daily);
    if (completedIds.length !== daily.challengeIds.length) {
      throw new Error("DAILY_NOT_COMPLETE");
    }
    const existing = await ctx.db
      .query("dailyCompletions")
      .withIndex("by_user_id_and_date", (q) => q.eq("userId", user._id).eq("date", args.date))
      .unique();
    const completion = existing ?? {
      _id: await ctx.db.insert("dailyCompletions", {
        userId: user._id,
        dailyChallengeId: daily._id,
        date: args.date,
        xpAwarded: DAILY_COMPLETION_XP,
        completedAt: now,
      }),
      date: args.date,
      completedAt: now,
      xpAwarded: DAILY_COMPLETION_XP,
    };
    const stats = await refreshPlayerStats(ctx, user._id, now);
    const newAchievements = existing
      ? []
      : await awardEligibleAchievements(ctx, user._id, stats.currentStreak, now);
    return {
      daily: {
        date: args.date,
        completion: {
          date: completion.date,
          completedAt: new Date(completion.completedAt).toISOString(),
          xpAwarded: completion.xpAwarded,
        },
        currentStreak: stats.currentStreak,
        longestStreak: stats.longestStreak,
        awardedNow: !existing,
        newAchievements,
      },
    };
  },
});
