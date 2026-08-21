import { DAILY_COMPLETION_XP } from "@/lib/domain/config";
import type { DailyCompletion, ResponseRecord } from "@/lib/domain/types";
import { findChallengeSeed } from "@/data/challenges.server";
import { evaluateAchievements } from "@/lib/services/achievements";
import { createAuthoritativeResponseRecord } from "@/lib/services/response-service.server";
import { calculateStreaks } from "@/lib/services/streaks";

export interface MockActorState {
  responses: ResponseRecord[];
  dailyCompletions: DailyCompletion[];
  earnedAchievementIds: string[];
}

type GlobalMockStore = typeof globalThis & {
  __roadiqMockActors?: Map<string, MockActorState>;
};

const globalStore = globalThis as GlobalMockStore;
const actors = globalStore.__roadiqMockActors ?? new Map<string, MockActorState>();
globalStore.__roadiqMockActors = actors;

export function actorIdFromRequest(request: Request): string | null {
  const actorId = request.headers.get("x-roadiq-actor-id")?.trim();
  return actorId && actorId.length <= 100 ? actorId : null;
}

export function getMockActorState(actorId: string): MockActorState {
  const existing = actors.get(actorId);
  if (existing) return existing;
  const state: MockActorState = {
    responses: [],
    dailyCompletions: [],
    earnedAchievementIds: [],
  };
  actors.set(actorId, state);
  return state;
}

export function saveMockActorState(actorId: string, state: MockActorState): void {
  actors.set(actorId, state);
}

export function importMockActorProgress(
  actorId: string,
  input: {
    responses: Array<{
      challengeId: string;
      answerId: string;
      idempotencyKey: string;
      answeredAt: string;
    }>;
    dailyDates: string[];
  },
): MockActorState {
  const current = getMockActorState(actorId);
  const responses = [...current.responses];

  for (const incoming of input.responses) {
    if (responses.some((response) => response.challengeId === incoming.challengeId)) continue;
    const challenge = findChallengeSeed(incoming.challengeId);
    if (!challenge) continue;
    try {
      responses.push(createAuthoritativeResponseRecord(
        challenge,
        incoming.answerId,
        incoming.idempotencyKey,
        incoming.answeredAt,
      ));
    } catch {
      // Invalid local records are ignored instead of being trusted by the service.
    }
  }

  const completionDates = new Set([
    ...current.dailyCompletions.map((completion) => completion.date),
    ...input.dailyDates,
  ]);
  const dailyCompletions = [...completionDates].sort().map((date) => ({
    date,
    completedAt:
      current.dailyCompletions.find((completion) => completion.date === date)?.completedAt ??
      `${date}T12:00:00.000Z`,
    xpAwarded: DAILY_COMPLETION_XP,
  }));
  const streaks = calculateStreaks(dailyCompletions);
  const earnedAchievementIds = evaluateAchievements(responses, streaks.current, []).map(
    (achievement) => achievement.id,
  );
  const next = { responses, dailyCompletions, earnedAchievementIds };
  saveMockActorState(actorId, next);
  return next;
}
