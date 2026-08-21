import { describe, expect, it } from "vitest";
import { CHALLENGE_SEEDS, listPublicChallenges } from "@/data/challenges.server";
import { submitMockResponse } from "@/lib/services/response-service.server";
import { CATEGORIES, DIFFICULTIES } from "@/lib/domain/types";
import { submitResponseSchema } from "@/lib/validation/api";

describe("seed content and response boundary", () => {
  it("contains the approved 24-challenge distribution", () => {
    expect(CHALLENGE_SEEDS).toHaveLength(24);
    for (const category of CATEGORIES) expect(CHALLENGE_SEEDS.filter((item) => item.category === category), category).toHaveLength(4);
    for (const difficulty of DIFFICULTIES) expect(CHALLENGE_SEEDS.filter((item) => item.difficulty === difficulty), difficulty).toHaveLength(6);
    expect(CHALLENGE_SEEDS.filter((item) => item.challengeType === "objective")).toHaveLength(14);
    expect(CHALLENGE_SEEDS.filter((item) => item.challengeType === "community")).toHaveLength(10);
    expect(CHALLENGE_SEEDS.filter((item) => item.region === "uk")).toHaveLength(8);
    expect(CHALLENGE_SEEDS.filter((item) => item.region === "global")).toHaveLength(16);
    for (const answerCount of [2, 3, 4]) expect(CHALLENGE_SEEDS.filter((item) => item.answers.length === answerCount), `${answerCount} answers`).toHaveLength(8);
  });

  it("removes answer keys and fixture votes from public payloads", () => {
    const challenge = listPublicChallenges()[0] as unknown as Record<string, unknown>;
    expect(challenge.correctAnswerId).toBeUndefined();
    expect(challenge.fixtureVotes).toBeUndefined();
  });

  it("returns objective correctness only after submission", () => {
    const result = submitMockResponse({ challengeId: "rq-001", answerId: "rq-001-a", idempotencyKey: "12345678-test", priorResponses: [], earnedAchievementIds: [], currentStreak: 0 });
    expect(result.isCorrect).toBe(true);
    expect(result.correctAnswerId).toBe("rq-001-a");
    expect(result.xpAwarded).toBe(5);
    expect(result.percentages.reduce((sum, item) => sum + item.percentage, 0)).toBe(100);
  });

  it("keeps the public submission contract to three fields", () => {
    expect(submitResponseSchema.safeParse({
      challengeId: "rq-001",
      answerId: "rq-001-a",
      idempotencyKey: "12345678-contract",
    }).success).toBe(true);
    expect(submitResponseSchema.safeParse({
      challengeId: "rq-001",
      answerId: "rq-001-a",
      idempotencyKey: "12345678-contract",
      priorResponses: [],
    }).success).toBe(false);
  });

  it("never labels a community answer correct", () => {
    const result = submitMockResponse({ challengeId: "rq-005", answerId: "rq-005-a", idempotencyKey: "12345678-community", priorResponses: [], earnedAchievementIds: [], currentStreak: 0 });
    expect(result.isCorrect).toBeNull();
    expect(result.correctAnswerId).toBeNull();
    expect(result.xpAwarded).toBe(5);
  });

  it("treats repeated submissions as duplicate-safe", () => {
    const first = submitMockResponse({ challengeId: "rq-001", answerId: "rq-001-a", idempotencyKey: "12345678-repeat", priorResponses: [], earnedAchievementIds: [], currentStreak: 0 });
    const duplicate = submitMockResponse({ challengeId: "rq-001", answerId: "rq-001-b", idempotencyKey: "12345678-new-key", priorResponses: [first.response], earnedAchievementIds: [], currentStreak: 0 });
    expect(duplicate.response.id).toBe(first.response.id);
    expect(duplicate.xpAwarded).toBe(0);
    expect(duplicate.totalXp).toBe(first.response.xpAwarded);
  });
});
