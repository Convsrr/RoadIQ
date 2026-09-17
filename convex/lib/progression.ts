export const CALIBRATION_ATTEMPTS = 5;
export const COMMUNITY_XP = 5;
export const DAILY_COMPLETION_XP = 50;

export const XP_BY_DIFFICULTY = {
  Easy: 5,
  Medium: 10,
  Hard: 15,
  Expert: 25,
} as const;

const DIFFICULTY_WEIGHT = {
  Easy: 1,
  Medium: 1.25,
  Hard: 1.5,
  Expert: 2,
} as const;

const CATEGORY_DIMENSIONS = {
  "Driver IQ": "Driving judgement",
  "Parking IQ": "Parking IQ",
  "Road IQ": "Road awareness",
  "Who's Wrong?": "Driving judgement",
  "Car IQ": "Car knowledge",
  "Spot It": "Hazard detection",
} as const;

const RANKS = [
  { name: "Rookie", threshold: 0 },
  { name: "Road Ready", threshold: 90 },
  { name: "Experienced", threshold: 105 },
  { name: "Advanced", threshold: 115 },
  { name: "Expert", threshold: 125 },
  { name: "Road Master", threshold: 140 },
  { name: "Elite", threshold: 150 },
] as const;

const PRIOR_ATTEMPTS = 8;
const PRIOR_ACCURACY = 0.6;

export type Category = keyof typeof CATEGORY_DIMENSIONS;
export type Difficulty = keyof typeof DIFFICULTY_WEIGHT;
export type ChallengeType = "objective" | "community";

export type ProgressResponse = {
  challengeType: ChallengeType;
  category: Category;
  difficulty: Difficulty;
  isCorrect: boolean | null;
  xpAwarded: number;
  answeredAt: number;
};

export type AchievementCriteria =
  | "parking_correct"
  | "spot_correct"
  | "objective_correct_streak"
  | "challenges_answered"
  | "daily_streak";

export type AchievementRule = {
  criteria: AchievementCriteria;
  value: number;
};

export function calculateRoadIq(responses: ProgressResponse[]): number {
  const objective = responses.filter((response) => response.challengeType === "objective");
  if (objective.length === 0) return 100;

  const weightedAttempts = objective.reduce(
    (sum, response) => sum + DIFFICULTY_WEIGHT[response.difficulty],
    0,
  );
  const weightedCorrect = objective.reduce(
    (sum, response) => sum + (response.isCorrect ? DIFFICULTY_WEIGHT[response.difficulty] : 0),
    0,
  );
  const adjustedAccuracy =
    (weightedCorrect + PRIOR_ATTEMPTS * PRIOR_ACCURACY) /
    (weightedAttempts + PRIOR_ATTEMPTS);
  const dimensions = new Set(objective.map((response) => CATEGORY_DIMENSIONS[response.category])).size;
  const breadthBonus = Math.min(10, Math.max(0, dimensions - 1) * 2);
  const volumeBonus = Math.min(10, Math.floor(objective.length / 10));
  return Math.round(
    Math.min(
      160,
      Math.max(40, 100 + (adjustedAccuracy - PRIOR_ACCURACY) * 100 + breadthBonus + volumeBonus),
    ),
  );
}

export function totalXp(responses: ProgressResponse[], dailyXp: number): number {
  return responses.reduce((sum, response) => sum + response.xpAwarded, 0) + dailyXp;
}

export function objectiveAttempts(responses: ProgressResponse[]): number {
  return responses.filter((response) => response.challengeType === "objective").length;
}

export function objectiveAccuracy(responses: ProgressResponse[]): number | null {
  const objective = responses.filter((response) => response.challengeType === "objective");
  return objective.length === 0
    ? null
    : objective.filter((response) => response.isCorrect).length / objective.length;
}

export function rankFor(score: number, attempts: number) {
  if (attempts < CALIBRATION_ATTEMPTS) {
    return {
      name: "Rookie",
      threshold: 0,
      nextName: "Road Ready",
      nextThreshold: CALIBRATION_ATTEMPTS,
      progress: attempts / CALIBRATION_ATTEMPTS,
      calibrated: false,
    };
  }

  const current = [...RANKS].reverse().find((rank) => score >= rank.threshold) ?? RANKS[0];
  const index = RANKS.findIndex((rank) => rank.name === current.name);
  const next = RANKS[index + 1] ?? null;
  return {
    name: current.name,
    threshold: current.threshold,
    nextName: next?.name ?? null,
    nextThreshold: next?.threshold ?? null,
    progress: next
      ? Math.min(1, Math.max(0, (score - current.threshold) / (next.threshold - current.threshold)))
      : 1,
    calibrated: true,
  };
}

export function longestObjectiveCorrectStreak(responses: ProgressResponse[]): number {
  let current = 0;
  let longest = 0;
  for (const response of [...responses].sort((a, b) => a.answeredAt - b.answeredAt)) {
    if (response.challengeType !== "objective") continue;
    current = response.isCorrect ? current + 1 : 0;
    longest = Math.max(longest, current);
  }
  return longest;
}

export function achievementSatisfied(
  achievement: AchievementRule,
  responses: ProgressResponse[],
  dailyStreak: number,
): boolean {
  switch (achievement.criteria) {
    case "parking_correct":
      return responses.filter((response) => response.category === "Parking IQ" && response.isCorrect).length >= achievement.value;
    case "spot_correct":
      return responses.filter((response) => response.category === "Spot It" && response.isCorrect).length >= achievement.value;
    case "objective_correct_streak":
      return longestObjectiveCorrectStreak(responses) >= achievement.value;
    case "challenges_answered":
      return responses.length >= achievement.value;
    case "daily_streak":
      return dailyStreak >= achievement.value;
  }
}

export function calculateStreak(dates: string[]): { current: number; longest: number } {
  const unique = [...new Set(dates)].sort();
  if (unique.length === 0) return { current: 0, longest: 0 };

  let longest = 1;
  let current = 1;
  for (let index = 1; index < unique.length; index += 1) {
    const previous = Date.parse(`${unique[index - 1]}T00:00:00Z`);
    const next = Date.parse(`${unique[index]}T00:00:00Z`);
    if ((next - previous) / 86_400_000 === 1) current += 1;
    else current = 1;
    longest = Math.max(longest, current);
  }
  return { current, longest };
}

export function weekStartTimestamp(now = Date.now()): number {
  const date = new Date(now);
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() - day + 1);
  date.setUTCHours(0, 0, 0, 0);
  return date.getTime();
}

export function weekStartKey(now = Date.now()): string {
  return new Date(weekStartTimestamp(now)).toISOString().slice(0, 10);
}

export function calculatePercentages(answerCounts: Record<string, number>): Array<{
  answerId: string;
  count: number;
  percentage: number;
}> {
  const entries = Object.entries(answerCounts);
  const total = entries.reduce((sum, [, count]) => sum + count, 0);
  if (total === 0) return entries.map(([answerId]) => ({ answerId, count: 0, percentage: 0 }));

  const floor = entries.map(([answerId, count]) => ({
    answerId,
    count,
    exact: (count / total) * 100,
    percentage: Math.floor((count / total) * 100),
  }));
  let remainder = 100 - floor.reduce((sum, item) => sum + item.percentage, 0);
  const byFraction = [...floor].sort(
    (a, b) => b.exact - b.percentage - (a.exact - a.percentage),
  );
  for (let index = 0; index < remainder; index += 1) {
    byFraction[index % byFraction.length].percentage += 1;
  }
  remainder = 0;
  return entries.map(([answerId]) => {
    const item = byFraction.find((candidate) => candidate.answerId === answerId)!;
    return { answerId, count: item.count, percentage: item.percentage + remainder };
  });
}

export function hash(input: string): number {
  let value = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    value ^= input.charCodeAt(index);
    value = Math.imul(value, 16777619);
  }
  return value >>> 0;
}

export function capabilitySnapshot(plan: "free" | "pro", status: string, expiresAt?: number) {
  const active = status === "active" && (!expiresAt || expiresAt > Date.now());
  const pro = plan === "pro" && active;
  return {
    canAccessUnlimitedChallenges: pro,
    canAccessAdvancedStats: pro,
    canAccessPremiumPacks: pro,
    isAdFree: pro,
  };
}
