import {
  CALIBRATION_ATTEMPTS,
  CATEGORY_DIMENSION_LABELS,
  DIFFICULTY_WEIGHT,
  RANKS,
} from "@/lib/domain/config";
import type {
  CategoryPerformance,
  LocalProgress,
  RankSnapshot,
  ResponseRecord,
} from "@/lib/domain/types";

const PRIOR_ATTEMPTS = 8;
const PRIOR_ACCURACY = 0.6;

export function calculateRoadIq(responses: ResponseRecord[]): number {
  const objective = responses.filter((response) => response.challengeType === "objective");
  if (objective.length === 0) return 100;

  const weightedAttempts = objective.reduce(
    (sum, response) => sum + DIFFICULTY_WEIGHT[response.difficulty],
    0,
  );
  const weightedCorrect = objective.reduce(
    (sum, response) =>
      sum + (response.isCorrect ? DIFFICULTY_WEIGHT[response.difficulty] : 0),
    0,
  );
  const adjustedAccuracy =
    (weightedCorrect + PRIOR_ATTEMPTS * PRIOR_ACCURACY) /
    (weightedAttempts + PRIOR_ATTEMPTS);
  const dimensions = new Set(
    objective.map((response) => CATEGORY_DIMENSION_LABELS[response.category]),
  ).size;
  const breadthBonus = Math.min(10, Math.max(0, dimensions - 1) * 2);
  const volumeBonus = Math.min(10, Math.floor(objective.length / 10));
  return Math.round(
    Math.min(160, Math.max(40, 100 + (adjustedAccuracy - PRIOR_ACCURACY) * 100 + breadthBonus + volumeBonus)),
  );
}

export function getRank(score: number, objectiveAttempts: number): RankSnapshot {
  if (objectiveAttempts < CALIBRATION_ATTEMPTS) {
    return {
      name: "Rookie",
      threshold: 0,
      nextName: "Road Ready",
      nextThreshold: CALIBRATION_ATTEMPTS,
      progress: objectiveAttempts / CALIBRATION_ATTEMPTS,
      calibrated: false,
    };
  }

  const current = [...RANKS].reverse().find((rank) => score >= rank.threshold) ?? RANKS[0];
  const index = RANKS.findIndex((rank) => rank.name === current.name);
  const next = RANKS[index + 1] ?? null;
  const progress = next
    ? Math.min(1, Math.max(0, (score - current.threshold) / (next.threshold - current.threshold)))
    : 1;
  return {
    name: current.name,
    threshold: current.threshold,
    nextName: next?.name ?? null,
    nextThreshold: next?.threshold ?? null,
    progress,
    calibrated: true,
  };
}

export function totalXp(progress: Pick<LocalProgress, "responses" | "dailyCompletions">): number {
  return (
    progress.responses.reduce((sum, response) => sum + response.xpAwarded, 0) +
    progress.dailyCompletions.reduce((sum, completion) => sum + completion.xpAwarded, 0)
  );
}

export function objectiveAccuracy(responses: ResponseRecord[]): number | null {
  const objective = responses.filter((response) => response.challengeType === "objective");
  if (objective.length === 0) return null;
  return objective.filter((response) => response.isCorrect).length / objective.length;
}

export function categoryPerformance(responses: ResponseRecord[]): CategoryPerformance[] {
  const categories = Array.from(new Set(responses.map((response) => response.category)));
  return categories.map((category) => {
    const objective = responses.filter(
      (response) => response.category === category && response.challengeType === "objective",
    );
    return {
      category,
      attempted: objective.length,
      correct: objective.filter((response) => response.isCorrect).length,
      accuracy:
        objective.length === 0
          ? null
          : objective.filter((response) => response.isCorrect).length / objective.length,
    };
  });
}

export function roadIqDelta(previous: ResponseRecord[], next: ResponseRecord[]): number {
  return calculateRoadIq(next) - calculateRoadIq(previous);
}
