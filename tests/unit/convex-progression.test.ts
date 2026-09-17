import { describe, expect, it } from "vitest";
import {
  calculateRoadIq,
  calculateStreak,
  capabilitySnapshot,
  rankFor,
  totalXp,
  weekStartKey,
} from "../../convex/lib/progression";

const answer = {
  challengeType: "objective" as const,
  category: "Road IQ" as const,
  difficulty: "Hard" as const,
  isCorrect: true,
  xpAwarded: 15,
  answeredAt: Date.parse("2026-09-14T12:00:00Z"),
};

describe("Convex progression helpers", () => {
  it("computes RoadIQ and rank from server-shaped responses", () => {
    const score = calculateRoadIq([answer, { ...answer, category: "Parking IQ" as const, difficulty: "Expert" as const }]);
    expect(score).toBeGreaterThan(100);
    expect(rankFor(score, 2)).toMatchObject({ name: "Rookie", calibrated: false });
  });

  it("keeps XP and Daily streak derivation server-side", () => {
    expect(totalXp([answer], 50)).toBe(65);
    expect(calculateStreak(["2026-09-12", "2026-09-13", "2026-09-15", "2026-09-16"])).toEqual({ current: 2, longest: 2 });
    expect(weekStartKey(Date.parse("2026-09-17T12:00:00Z"))).toBe("2026-09-14");
  });

  it("exposes neutral future entitlement capabilities without billing coupling", () => {
    expect(capabilitySnapshot("free", "active")).toEqual({
      canAccessUnlimitedChallenges: false,
      canAccessAdvancedStats: false,
      canAccessPremiumPacks: false,
      isAdFree: false,
    });
    expect(capabilitySnapshot("pro", "active", Date.now() + 60_000).isAdFree).toBe(true);
    expect(capabilitySnapshot("pro", "expired").canAccessPremiumPacks).toBe(false);
  });
});
