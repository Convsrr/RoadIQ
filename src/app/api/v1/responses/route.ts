import { NextResponse } from "next/server";
import { submitMockResponse } from "@/lib/services/response-service.server";
import { submitResponseSchema } from "@/lib/validation/api";
import {
  actorIdFromRequest,
  getMockActorState,
  saveMockActorState,
} from "@/lib/repositories/mock-progress.server";
import { calculateStreaks } from "@/lib/services/streaks";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = submitResponseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Check the response details and try again." },
      { status: 400 },
    );
  }
  const actorId = actorIdFromRequest(request);
  if (!actorId) {
    return NextResponse.json({ error: "Anonymous player identity is required." }, { status: 401 });
  }
  try {
    const state = getMockActorState(actorId);
    const result = submitMockResponse({
      ...parsed.data,
      priorResponses: state.responses,
      earnedAchievementIds: state.earnedAchievementIds,
      currentStreak: calculateStreaks(state.dailyCompletions).current,
    });
    saveMockActorState(actorId, {
      ...state,
      responses: state.responses.some((response) => response.id === result.response.id)
        ? state.responses
        : [...state.responses, result.response],
      earnedAchievementIds: [
        ...new Set([
          ...state.earnedAchievementIds,
          ...result.newlyEarnedAchievements.map((achievement) => achievement.id),
        ]),
      ],
    });
    return NextResponse.json({ result, mode: "mock" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN";
    const status = message === "CHALLENGE_NOT_FOUND" ? 404 : 400;
    return NextResponse.json(
      { error: status === 404 ? "Challenge not found." : "That answer is unavailable." },
      { status },
    );
  }
}
