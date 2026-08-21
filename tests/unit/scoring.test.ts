import { describe, expect, it } from "vitest";
import type { ResponseRecord } from "@/lib/domain/types";
import { calculateRoadIq, getRank, objectiveAccuracy } from "@/lib/services/scoring";

function response(overrides: Partial<ResponseRecord> = {}): ResponseRecord {
  return {
    id: crypto.randomUUID(),
    idempotencyKey: crypto.randomUUID(),
    challengeId: crypto.randomUUID(),
    answerId: crypto.randomUUID(),
    challengeType: "objective",
    category: "Driver IQ",
    difficulty: "Easy",
    isCorrect: true,
    xpAwarded: 5,
    answeredAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("RoadIQ scoring", () => {
  it("starts at a calibrated-looking neutral score", () => {
    expect(calculateRoadIq([])).toBe(100);
  });

  it("moves up after a correct answer and down after a miss", () => {
    expect(calculateRoadIq([response({ isCorrect: true })])).toBeGreaterThan(100);
    expect(calculateRoadIq([response({ isCorrect: false })])).toBeLessThan(100);
  });

  it("honours the 40 to 160 score boundaries", () => {
    const wrong = Array.from({ length: 500 }, () => response({ isCorrect: false, difficulty: "Expert" }));
    const right = Array.from({ length: 500 }, (_, index) => response({
      isCorrect: true,
      difficulty: "Expert",
      category: (["Driver IQ", "Parking IQ", "Road IQ", "Car IQ", "Spot It"] as const)[index % 5],
    }));
    expect(calculateRoadIq(wrong)).toBeGreaterThanOrEqual(40);
    expect(calculateRoadIq(right)).toBeLessThanOrEqual(160);
  });

  it("keeps rank in calibration until five objective answers", () => {
    expect(getRank(130, 4)).toMatchObject({ name: "Rookie", calibrated: false, progress: 0.8 });
    expect(getRank(130, 5)).toMatchObject({ name: "Expert", calibrated: true });
  });

  it("excludes community votes from objective accuracy", () => {
    expect(objectiveAccuracy([
      response({ isCorrect: true }),
      response({ challengeType: "community", isCorrect: null }),
      response({ isCorrect: false }),
    ])).toBe(0.5);
  });
});
