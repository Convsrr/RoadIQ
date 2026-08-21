import { describe, expect, it } from "vitest";
import { DAILY_COMPLETION_XP, XP_BY_DIFFICULTY } from "@/lib/domain/config";
import type { DailyCompletion, ResponseRecord } from "@/lib/domain/types";
import { achievementSatisfied, ACHIEVEMENTS, longestObjectiveCorrectStreak } from "@/lib/services/achievements";
import { addDailyCompletion, calculateStreaks } from "@/lib/services/streaks";

function response(index: number, correct = true): ResponseRecord {
  return {
    id: `r-${index}`,
    idempotencyKey: `key-${index}`,
    challengeId: `c-${index}`,
    answerId: `a-${index}`,
    challengeType: "objective",
    category: "Parking IQ",
    difficulty: "Hard",
    isCorrect: correct,
    xpAwarded: 15,
    answeredAt: new Date(2026, 0, index + 1).toISOString(),
  };
}

describe("progression rules", () => {
  it("keeps XP values in one source of truth", () => {
    expect(XP_BY_DIFFICULTY).toEqual({ Easy: 5, Medium: 10, Hard: 15, Expert: 25 });
    expect(DAILY_COMPLETION_XP).toBe(50);
  });

  it("awards a Daily completion once", () => {
    const once = addDailyCompletion([], "2026-08-21", 50, new Date("2026-08-21T10:00:00Z"));
    const twice = addDailyCompletion(once, "2026-08-21", 50, new Date("2026-08-21T12:00:00Z"));
    expect(twice).toHaveLength(1);
    expect(twice[0].xpAwarded).toBe(50);
  });

  it("calculates current and longest streaks across gaps", () => {
    const completions: DailyCompletion[] = ["2026-08-14", "2026-08-15", "2026-08-18", "2026-08-19", "2026-08-20"].map((date) => ({ date, completedAt: `${date}T12:00:00Z`, xpAwarded: 50 }));
    expect(calculateStreaks(completions)).toEqual({ current: 3, longest: 3 });
  });

  it("resets the perfect-answer streak after a miss", () => {
    const responses = [...Array.from({ length: 9 }, (_, index) => response(index)), response(9, false), ...Array.from({ length: 10 }, (_, index) => response(index + 10))];
    expect(longestObjectiveCorrectStreak(responses)).toBe(10);
    const perfectTen = ACHIEVEMENTS.find((achievement) => achievement.slug === "perfect-ten")!;
    expect(achievementSatisfied(perfectTen, responses, 0)).toBe(true);
  });

  it("evaluates each seeded achievement condition", () => {
    const parking = Array.from({ length: 1000 }, (_, index) => response(index));
    const spot = Array.from({ length: 10 }, (_, index) => ({ ...response(index + 1000), category: "Spot It" as const }));
    const all = [...parking, ...spot];
    for (const achievement of ACHIEVEMENTS) {
      const streak = achievement.criteria === "daily_streak" ? 30 : 0;
      expect(achievementSatisfied(achievement, all, streak), achievement.slug).toBe(true);
    }
  });
});
