import { describe, expect, it } from "vitest";
import { listPublicChallenges } from "@/data/challenges.server";
import type { ResponseRecord } from "@/lib/domain/types";
import { dailyChallengeIds, orderFeed } from "@/lib/services/feed";
import { calculatePercentages } from "@/lib/services/percentages";

describe("feed and percentages", () => {
  it("uses the largest remainder method so percentages sum to 100", () => {
    const result = calculatePercentages({ a: 1, b: 1, c: 1 });
    expect(result.reduce((sum, item) => sum + item.percentage, 0)).toBe(100);
    expect(result.map((item) => item.percentage).sort()).toEqual([33, 33, 34]);
  });

  it("adds the selected answer to the displayed fixture totals", () => {
    expect(calculatePercentages({ a: 1, b: 1 }, "a")).toEqual([
      { answerId: "a", count: 2, percentage: 67 },
      { answerId: "b", count: 1, percentage: 33 },
    ]);
  });

  it("keeps unseen challenges ahead of answered challenges", () => {
    const challenges = listPublicChallenges().slice(0, 3);
    const answered: ResponseRecord = {
      id: "r", idempotencyKey: "k", challengeId: challenges[0].id, answerId: challenges[0].answers[0].id,
      challengeType: challenges[0].challengeType, category: challenges[0].category, difficulty: challenges[0].difficulty,
      isCorrect: true, xpAwarded: 5, answeredAt: new Date().toISOString(),
    };
    expect(orderFeed(challenges, [answered], "actor").at(-1)?.id).toBe(challenges[0].id);
  });

  it("creates a stable five-challenge Daily set", () => {
    const challenges = listPublicChallenges();
    const first = dailyChallengeIds(challenges, "2026-08-21");
    const second = dailyChallengeIds(challenges, "2026-08-21");
    expect(first).toEqual(second);
    expect(new Set(first).size).toBe(5);
  });
});
