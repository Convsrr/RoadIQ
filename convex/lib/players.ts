import type { MutationCtx, QueryCtx } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";
import {
  calculateRoadIq,
  calculateStreak,
  capabilitySnapshot,
  objectiveAccuracy,
  objectiveAttempts,
  rankFor,
  totalXp,
  weekStartKey,
  weekStartTimestamp,
  type Category,
  type ProgressResponse,
} from "./progression";

type ReadContext = QueryCtx | MutationCtx;

const CATEGORIES: Category[] = [
  "Driver IQ",
  "Parking IQ",
  "Road IQ",
  "Who's Wrong?",
  "Car IQ",
  "Spot It",
];

export function assertSessionId(sessionId: string): void {
  if (sessionId.length < 8 || sessionId.length > 100) {
    throw new Error("INVALID_ANONYMOUS_SESSION");
  }
}

export async function getUserBySession(
  ctx: ReadContext,
  sessionId: string,
): Promise<Doc<"users"> | null> {
  return await ctx.db
    .query("users")
    .withIndex("by_anonymous_id", (q) => q.eq("anonymousId", sessionId))
    .unique();
}

export async function ensureAnonymousPlayer(
  ctx: MutationCtx,
  sessionId: string,
  now = Date.now(),
): Promise<Doc<"users">> {
  assertSessionId(sessionId);
  const existing = await getUserBySession(ctx, sessionId);
  if (existing) return existing;

  const username = `Driver ${sessionId.replace(/[^a-z0-9]/gi, "").slice(-4).toUpperCase() || "IQ"}`;
  const userId = await ctx.db.insert("users", {
    anonymousId: sessionId,
    username,
    isAnonymous: true,
    createdAt: now,
    updatedAt: now,
  });
  await ctx.db.insert("playerStats", {
    userId,
    xp: 0,
    roadIqScore: 100,
    objectiveAttempts: 0,
    challengesAnswered: 0,
    currentStreak: 0,
    longestStreak: 0,
    weeklyXp: 0,
    weeklyPeriod: weekStartKey(now),
    updatedAt: now,
  });
  return (await ctx.db.get(userId))!;
}

export async function getPlayerStats(
  ctx: ReadContext,
  userId: Id<"users">,
): Promise<Doc<"playerStats"> | null> {
  return await ctx.db
    .query("playerStats")
    .withIndex("by_user_id", (q) => q.eq("userId", userId))
    .unique();
}

export async function responsesForPlayer(
  ctx: ReadContext,
  userId: Id<"users">,
): Promise<Doc<"challengeResponses">[]> {
  return await ctx.db
    .query("challengeResponses")
    .withIndex("by_user_id_and_answered_at", (q) => q.eq("userId", userId))
    .order("asc")
    .take(5_000);
}

export async function dailyCompletionsForPlayer(
  ctx: ReadContext,
  userId: Id<"users">,
): Promise<Doc<"dailyCompletions">[]> {
  return await ctx.db
    .query("dailyCompletions")
    .withIndex("by_user_id", (q) => q.eq("userId", userId))
    .take(5_000);
}

export function asProgressResponse(response: Doc<"challengeResponses">): ProgressResponse {
  return {
    challengeType: response.challengeType,
    category: response.category,
    difficulty: response.difficulty,
    isCorrect: response.isCorrect,
    xpAwarded: response.xpAwarded,
    answeredAt: response.answeredAt,
  };
}

export async function refreshPlayerStats(
  ctx: MutationCtx,
  userId: Id<"users">,
  now = Date.now(),
): Promise<Doc<"playerStats">> {
  const [responses, completions, existing] = await Promise.all([
    responsesForPlayer(ctx, userId),
    dailyCompletionsForPlayer(ctx, userId),
    getPlayerStats(ctx, userId),
  ]);
  const progressResponses = responses.map(asProgressResponse);
  const dailyXp = completions.reduce((sum, completion) => sum + completion.xpAwarded, 0);
  const currentWeekStart = weekStartTimestamp(now);
  const weeklyXp = responses
    .filter((response) => response.answeredAt >= currentWeekStart)
    .reduce((sum, response) => sum + response.xpAwarded, 0) + completions
    .filter((completion) => completion.completedAt >= currentWeekStart)
    .reduce((sum, completion) => sum + completion.xpAwarded, 0);
  const streak = calculateStreak(completions.map((completion) => completion.date));
  const values = {
    xp: totalXp(progressResponses, dailyXp),
    roadIqScore: calculateRoadIq(progressResponses),
    objectiveAttempts: objectiveAttempts(progressResponses),
    challengesAnswered: progressResponses.length,
    currentStreak: streak.current,
    longestStreak: streak.longest,
    weeklyXp,
    weeklyPeriod: weekStartKey(now),
    updatedAt: now,
  };

  if (existing) {
    await ctx.db.patch(existing._id, values);
    return { ...existing, ...values };
  }
  const statsId = await ctx.db.insert("playerStats", { userId, ...values });
  return (await ctx.db.get(statsId))!;
}

export async function entitlementForPlayer(ctx: ReadContext, userId: Id<"users">) {
  const entitlement = await ctx.db
    .query("entitlements")
    .withIndex("by_user_id", (q) => q.eq("userId", userId))
    .unique();
  const plan = entitlement?.plan ?? "free";
  const status = entitlement?.status ?? "active";
  const expiresAt = entitlement?.expiresAt;
  return {
    plan,
    status,
    expiresAt: expiresAt ?? null,
    provider: entitlement?.provider ?? null,
    providerCustomerId: entitlement?.providerCustomerId ?? null,
    capabilities: capabilitySnapshot(plan, status, expiresAt),
  };
}

export async function playerSnapshot(ctx: ReadContext, user: Doc<"users">) {
  const [stats, responses, playerAchievements, entitlement] = await Promise.all([
    getPlayerStats(ctx, user._id),
    responsesForPlayer(ctx, user._id),
    ctx.db
      .query("playerAchievements")
      .withIndex("by_user_id", (q) => q.eq("userId", user._id))
      .take(100),
    entitlementForPlayer(ctx, user._id),
  ]);
  const progressResponses = responses.map(asProgressResponse);
  const resolvedStats = stats ?? {
    xp: 0,
    roadIqScore: 100,
    objectiveAttempts: 0,
    challengesAnswered: 0,
    currentStreak: 0,
    longestStreak: 0,
    weeklyXp: 0,
    weeklyPeriod: weekStartKey(),
  };
  const achievements = await Promise.all(playerAchievements.map(async (earned) => {
    const achievement = await ctx.db.get(earned.achievementId);
    return achievement ? { achievementId: achievement.stableId, earnedAt: new Date(earned.earnedAt).toISOString() } : null;
  }));

  return {
    actorId: user.anonymousId,
    username: user.username,
    roadIqScore: resolvedStats.roadIqScore,
    rank: rankFor(resolvedStats.roadIqScore, resolvedStats.objectiveAttempts),
    xp: resolvedStats.xp,
    challengesAnswered: resolvedStats.challengesAnswered,
    objectiveAccuracy: objectiveAccuracy(progressResponses),
    currentStreak: resolvedStats.currentStreak,
    longestStreak: resolvedStats.longestStreak,
    categoryPerformance: CATEGORIES.map((category) => {
      const objective = progressResponses.filter(
        (response) => response.category === category && response.challengeType === "objective",
      );
      return {
        category,
        attempted: objective.length,
        correct: objective.filter((response) => response.isCorrect).length,
        accuracy: objective.length === 0 ? null : objective.filter((response) => response.isCorrect).length / objective.length,
      };
    }),
    achievements: achievements.filter((achievement): achievement is NonNullable<typeof achievement> => achievement !== null),
    entitlement,
  };
}
