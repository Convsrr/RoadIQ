import { NextResponse } from "next/server";
import { mockProgressImportSchema } from "@/lib/validation/api";
import {
  actorIdFromRequest,
  getMockActorState,
  importMockActorProgress,
} from "@/lib/repositories/mock-progress.server";
import { calculateRoadIq, getRank } from "@/lib/services/scoring";
import { calculateStreaks } from "@/lib/services/streaks";
import { api } from "../../../../../convex/_generated/api";
import { getConvexClient, isConvexBackendEnabled } from "@/lib/convex/server";

function snapshot(actorId: string) {
  const state = getMockActorState(actorId);
  const score = calculateRoadIq(state.responses);
  const objectiveAttempts = state.responses.filter(
    (response) => response.challengeType === "objective",
  ).length;
  const streaks = calculateStreaks(state.dailyCompletions);
  return {
    actorId,
    roadIqScore: score,
    xp: state.responses.reduce((sum, response) => sum + response.xpAwarded, 0) +
      state.dailyCompletions.reduce((sum, completion) => sum + completion.xpAwarded, 0),
    rank: getRank(score, objectiveAttempts),
    challengesAnswered: state.responses.length,
    currentStreak: streaks.current,
    longestStreak: streaks.longest,
    earnedAchievementIds: state.earnedAchievementIds,
  };
}

export async function GET(request: Request) {
  const actorId = actorIdFromRequest(request);
  if (!actorId) {
    return NextResponse.json({
      profile: null,
      mode: "mock",
      message: "Mock progress is stored on this device.",
    });
  }
  if (isConvexBackendEnabled()) {
    const result = await getConvexClient().mutation(api.players.ensureAnonymous, { sessionId: actorId });
    return NextResponse.json({ profile: result.profile, mode: "convex" });
  }
  return NextResponse.json({ profile: snapshot(actorId), mode: "mock" });
}

export async function PUT(request: Request) {
  const actorId = actorIdFromRequest(request);
  if (!actorId) {
    return NextResponse.json({ error: "Anonymous player identity is required." }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  const parsed = mockProgressImportSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Local progress could not be imported." }, { status: 400 });
  }
  if (isConvexBackendEnabled()) {
    try {
      const result = await getConvexClient().mutation(api.players.importProgress, {
        sessionId: actorId,
        responses: parsed.data.responses.map((response) => ({
          ...response,
          answeredAt: Date.parse(response.answeredAt),
        })),
        dailyDates: parsed.data.dailyDates,
      });
      return NextResponse.json({ profile: result.profile, imported: true, mode: "convex" });
    } catch {
      return NextResponse.json({ error: "Local progress could not be imported." }, { status: 400 });
    }
  }
  importMockActorProgress(actorId, parsed.data);
  return NextResponse.json({ profile: snapshot(actorId), imported: true, mode: "mock" });
}
