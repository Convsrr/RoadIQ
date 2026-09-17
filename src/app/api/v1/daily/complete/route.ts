import { NextResponse } from "next/server";
import { DAILY_COMPLETION_XP } from "@/lib/domain/config";
import { listPublicChallenges } from "@/data/challenges.server";
import {
  actorIdFromRequest,
  getMockActorState,
  saveMockActorState,
} from "@/lib/repositories/mock-progress.server";
import { dailyChallengeIds } from "@/lib/services/feed";
import { evaluateAchievements } from "@/lib/services/achievements";
import { addDailyCompletion, calculateStreaks } from "@/lib/services/streaks";
import { api } from "../../../../../../convex/_generated/api";
import { getConvexClient, isConvexBackendEnabled } from "@/lib/convex/server";

export async function POST(request: Request) {
  const actorId = actorIdFromRequest(request);
  if (!actorId) {
    return NextResponse.json({ error: "Anonymous player identity is required." }, { status: 401 });
  }
  const body = (await request.json().catch(() => null)) as { date?: unknown } | null;
  if (!body || typeof body.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(body.date)) {
    return NextResponse.json({ error: "Invalid Daily date." }, { status: 400 });
  }
  if (isConvexBackendEnabled()) {
    try {
      const result = await getConvexClient().mutation(api.daily.completeDaily, { sessionId: actorId, date: body.date });
      return NextResponse.json(result);
    } catch {
      return NextResponse.json({ error: "Complete all five Daily challenges first." }, { status: 409 });
    }
  }

  const state = getMockActorState(actorId);
  const challengeIds = dailyChallengeIds(listPublicChallenges(), body.date);
  const completed = challengeIds.every((challengeId) =>
    state.responses.some((response) => response.challengeId === challengeId),
  );
  if (!completed) {
    return NextResponse.json({ error: "Complete all five Daily challenges first." }, { status: 409 });
  }

  const dailyCompletions = addDailyCompletion(
    state.dailyCompletions,
    body.date,
    DAILY_COMPLETION_XP,
  );
  const streaks = calculateStreaks(dailyCompletions);
  const completion = dailyCompletions.find((item) => item.date === body.date)!;
  const newAchievements = evaluateAchievements(
    state.responses,
    streaks.current,
    state.earnedAchievementIds,
  );
  saveMockActorState(actorId, {
    ...state,
    dailyCompletions,
    earnedAchievementIds: [
      ...new Set([
        ...state.earnedAchievementIds,
        ...newAchievements.map((achievement) => achievement.id),
      ]),
    ],
  });
  return NextResponse.json({
    daily: {
      date: body.date,
      completion,
      currentStreak: streaks.current,
      longestStreak: streaks.longest,
      awardedNow: dailyCompletions.length > state.dailyCompletions.length,
      newAchievements,
    },
    mode: "mock",
  });
}
