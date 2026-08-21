import { COMMUNITY_XP, XP_BY_DIFFICULTY } from "@/lib/domain/config";
import type { ChallengeResult, ChallengeSeed, ResponseRecord } from "@/lib/domain/types";
import { findChallengeSeed } from "@/data/challenges.server";
import { evaluateAchievements } from "@/lib/services/achievements";
import { calculatePercentages } from "@/lib/services/percentages";
import { calculateRoadIq, getRank } from "@/lib/services/scoring";

export interface SubmitResponseInput {
  challengeId: string;
  answerId: string;
  idempotencyKey: string;
  priorResponses: ResponseRecord[];
  earnedAchievementIds: string[];
  currentStreak: number;
}

export function createAuthoritativeResponseRecord(
  challenge: ChallengeSeed,
  answerId: string,
  idempotencyKey: string,
  answeredAt = new Date().toISOString(),
): ResponseRecord {
  if (!challenge.answers.some((answer) => answer.id === answerId)) {
    throw new Error("ANSWER_NOT_FOUND");
  }
  return {
    id: `response-${idempotencyKey}`,
    idempotencyKey,
    challengeId: challenge.id,
    answerId,
    challengeType: challenge.challengeType,
    category: challenge.category,
    difficulty: challenge.difficulty,
    isCorrect:
      challenge.challengeType === "objective"
        ? answerId === challenge.correctAnswerId
        : null,
    xpAwarded:
      challenge.challengeType === "community"
        ? COMMUNITY_XP
        : XP_BY_DIFFICULTY[challenge.difficulty],
    answeredAt,
  };
}

export function submitMockResponse(input: SubmitResponseInput): ChallengeResult {
  const challenge = findChallengeSeed(input.challengeId);
  if (!challenge) throw new Error("CHALLENGE_NOT_FOUND");
  if (!challenge.answers.some((answer) => answer.id === input.answerId)) {
    throw new Error("ANSWER_NOT_FOUND");
  }

  const previousScore = calculateRoadIq(input.priorResponses);
  const idempotentResponse = input.priorResponses.find(
    (response) => response.idempotencyKey === input.idempotencyKey,
  );
  if (idempotentResponse && idempotentResponse.challengeId !== challenge.id) {
    throw new Error("IDEMPOTENCY_CONFLICT");
  }
  const duplicate = idempotentResponse ?? input.priorResponses.find(
    (response) => response.challengeId === challenge.id,
  );
  const response: ResponseRecord =
    duplicate ?? createAuthoritativeResponseRecord(
      challenge,
      input.answerId,
      input.idempotencyKey,
    );
  const nextResponses = duplicate ? input.priorResponses : [...input.priorResponses, response];
  const percentages = calculatePercentages(challenge.fixtureVotes, response.answerId);
  const majority = [...percentages].sort((a, b) => b.percentage - a.percentage)[0];
  const score = calculateRoadIq(nextResponses);
  const objectiveAttempts = nextResponses.filter(
    (item) => item.challengeType === "objective",
  ).length;
  const newlyEarnedAchievements = evaluateAchievements(
    nextResponses,
    input.currentStreak,
    input.earnedAchievementIds,
  );

  return {
    response,
    selectedAnswerId: response.answerId,
    correctAnswerId: challenge.correctAnswerId,
    isCorrect: response.isCorrect,
    percentages,
    totalResponses: percentages.reduce((sum, item) => sum + item.count, 0),
    majorityAnswerId: majority.answerId,
    majorityAgreement:
      response.answerId === majority.answerId
        ? majority.percentage
        : 100 - majority.percentage,
    xpAwarded: duplicate ? 0 : response.xpAwarded,
    totalXp: nextResponses.reduce((sum, item) => sum + item.xpAwarded, 0),
    roadIqScore: score,
    previousRoadIqScore: previousScore,
    rank: getRank(score, objectiveAttempts),
    newlyEarnedAchievements,
  };
}
