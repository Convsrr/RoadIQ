import { v } from "convex/values";
import { mutation, type MutationCtx } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { awardEligibleAchievements } from "./lib/achievements";
import { recordChallengeResponse } from "./lib/challengeStats";
import { COMMUNITY_XP, XP_BY_DIFFICULTY, calculatePercentages, rankFor } from "./lib/progression";
import { ensureAnonymousPlayer, getPlayerStats, refreshPlayerStats } from "./lib/players";
import { challengeResultValidator } from "./lib/validators";

export type ServerResponseInput = {
  challengeId: string;
  answerId: string;
  idempotencyKey: string;
  /** Used only by the local-progress import path. The server still resolves every other value. */
  answeredAt?: number;
};

async function responseResult(
  ctx: MutationCtx,
  input: {
    response: Doc<"challengeResponses">;
    challenge: Doc<"challenges">;
    previousRoadIqScore: number;
    xpAwarded: number;
    newlyEarnedAchievements: Array<{
      id: string;
      slug: string;
      name: string;
      description: string;
      icon: string;
      criteria: "parking_correct" | "spot_correct" | "objective_correct_streak" | "challenges_answered" | "daily_streak";
      value: number;
    }>;
  },
) {
  const [answer, answerKey, challengeStats, stats] = await Promise.all([
    ctx.db.get(input.response.answerId),
    input.challenge.challengeType === "objective"
      ? ctx.db.query("objectiveAnswerKeys").withIndex("by_challenge_id", (q) => q.eq("challengeId", input.challenge._id)).unique()
      : null,
    ctx.db.query("challengeStats").withIndex("by_challenge_id", (q) => q.eq("challengeId", input.challenge._id)).unique(),
    getPlayerStats(ctx, input.response.userId),
  ]);
  const correctAnswer = answerKey ? await ctx.db.get(answerKey.answerId) : null;
  const percentages = calculatePercentages(challengeStats?.answerCounts ?? { [answer?.stableId ?? "unknown"]: 1 });
  const majority = [...percentages].sort((a, b) => b.percentage - a.percentage)[0] ?? {
    answerId: answer?.stableId ?? "unknown",
    count: 0,
    percentage: 0,
  };
  const resolvedStats = stats ?? {
    xp: 0,
    roadIqScore: 100,
    objectiveAttempts: 0,
  };
  return {
    response: {
      id: input.response._id,
      idempotencyKey: input.response.idempotencyKey,
      challengeId: input.challenge.stableId,
      answerId: answer?.stableId ?? "",
      challengeType: input.response.challengeType,
      category: input.response.category,
      difficulty: input.response.difficulty,
      isCorrect: input.response.isCorrect,
      xpAwarded: input.response.xpAwarded,
      answeredAt: new Date(input.response.answeredAt).toISOString(),
    },
    selectedAnswerId: answer?.stableId ?? "",
    correctAnswerId: correctAnswer?.stableId ?? null,
    isCorrect: input.response.isCorrect,
    percentages,
    totalResponses: challengeStats?.totalResponses ?? 0,
    majorityAnswerId: majority.answerId,
    majorityAgreement:
      answer?.stableId === majority.answerId
        ? majority.percentage
        : 100 - majority.percentage,
    xpAwarded: input.xpAwarded,
    totalXp: resolvedStats.xp,
    roadIqScore: resolvedStats.roadIqScore,
    previousRoadIqScore: input.previousRoadIqScore,
    rank: rankFor(resolvedStats.roadIqScore, resolvedStats.objectiveAttempts),
    newlyEarnedAchievements: input.newlyEarnedAchievements,
  };
}

export async function submitServerResponse(
  ctx: MutationCtx,
  user: Doc<"users">,
  args: ServerResponseInput,
) {
  if (args.idempotencyKey.length < 8 || args.idempotencyKey.length > 100) {
    throw new Error("INVALID_IDEMPOTENCY_KEY");
  }
    const challenge = await ctx.db
      .query("challenges")
      .withIndex("by_stable_id", (q) => q.eq("stableId", args.challengeId))
      .unique();
    if (!challenge || challenge.status !== "published") throw new Error("CHALLENGE_NOT_FOUND");
    const answer = await ctx.db
      .query("challengeAnswers")
      .withIndex("by_stable_id", (q) => q.eq("stableId", args.answerId))
      .unique();
    if (!answer || answer.challengeId !== challenge._id) throw new Error("ANSWER_NOT_FOUND");

    const [idempotentResponse, duplicateChallengeResponse, previousStats] = await Promise.all([
      ctx.db
        .query("challengeResponses")
        .withIndex("by_user_id_and_idempotency_key", (q) => q.eq("userId", user._id).eq("idempotencyKey", args.idempotencyKey))
        .unique(),
      ctx.db
        .query("challengeResponses")
        .withIndex("by_user_id_and_challenge_id", (q) => q.eq("userId", user._id).eq("challengeId", challenge._id))
        .unique(),
      getPlayerStats(ctx, user._id),
    ]);
    if (idempotentResponse && idempotentResponse.challengeId !== challenge._id) {
      throw new Error("IDEMPOTENCY_CONFLICT");
    }
    const duplicate = idempotentResponse ?? duplicateChallengeResponse;
    const previousRoadIqScore = previousStats?.roadIqScore ?? 100;
    if (duplicate) {
      return await responseResult(ctx, {
        response: duplicate,
        challenge,
        previousRoadIqScore,
        xpAwarded: 0,
        newlyEarnedAchievements: [],
      });
    }

    const answerKey = challenge.challengeType === "objective"
      ? await ctx.db
          .query("objectiveAnswerKeys")
          .withIndex("by_challenge_id", (q) => q.eq("challengeId", challenge._id))
          .unique()
      : null;
    if (challenge.challengeType === "objective" && !answerKey) throw new Error("OBJECTIVE_KEY_MISSING");
    const now = args.answeredAt ?? Date.now();
    const xpAwarded = challenge.challengeType === "community"
      ? COMMUNITY_XP
      : XP_BY_DIFFICULTY[challenge.difficulty];
    const responseId = await ctx.db.insert("challengeResponses", {
      userId: user._id,
      challengeId: challenge._id,
      answerId: answer._id,
      idempotencyKey: args.idempotencyKey,
      challengeType: challenge.challengeType,
      category: challenge.category,
      difficulty: challenge.difficulty,
      isCorrect: challenge.challengeType === "objective" ? answer._id === answerKey!.answerId : null,
      xpAwarded,
      answeredAt: now,
    });
    const answerChoices = await ctx.db
      .query("challengeAnswers")
      .withIndex("by_challenge_id_and_sort_order", (q) => q.eq("challengeId", challenge._id))
      .take(8);
    await recordChallengeResponse(ctx, challenge._id, answer.stableId, answerChoices.map((choice) => choice.stableId), now);
    const nextStats = await refreshPlayerStats(ctx, user._id, now);
    const newlyEarnedAchievements = await awardEligibleAchievements(ctx, user._id, nextStats.currentStreak, now);
    const response = (await ctx.db.get(responseId))!;
    return await responseResult(ctx, {
      response,
      challenge,
      previousRoadIqScore,
      xpAwarded,
      newlyEarnedAchievements,
    });
}

export const submitResponse = mutation({
  args: {
    sessionId: v.string(),
    challengeId: v.string(),
    answerId: v.string(),
    idempotencyKey: v.string(),
  },
  returns: challengeResultValidator,
  handler: async (ctx, args) => {
    const user = await ensureAnonymousPlayer(ctx, args.sessionId);
    return await submitServerResponse(ctx, user, args);
  },
});
