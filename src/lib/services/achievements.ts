import type {
  AchievementDefinition,
  EarnedAchievement,
  ResponseRecord,
} from "@/lib/domain/types";

export const ACHIEVEMENTS: AchievementDefinition[] = [
  {
    id: "achievement-parking-pro",
    slug: "parking-pro",
    name: "Parking Pro",
    description: "Get 20 Parking IQ challenges correct.",
    icon: "parking",
    criteria: "parking_correct",
    value: 20,
  },
  {
    id: "achievement-eagle-eye",
    slug: "eagle-eye",
    name: "Eagle Eye",
    description: "Get 10 Spot It challenges correct.",
    icon: "eye",
    criteria: "spot_correct",
    value: 10,
  },
  {
    id: "achievement-perfect-ten",
    slug: "perfect-ten",
    name: "Perfect Ten",
    description: "Answer 10 objective challenges correctly in a row.",
    icon: "target",
    criteria: "objective_correct_streak",
    value: 10,
  },
  {
    id: "achievement-road-scholar",
    slug: "road-scholar",
    name: "Road Scholar",
    description: "Answer 100 challenges.",
    icon: "book-open",
    criteria: "challenges_answered",
    value: 100,
  },
  {
    id: "achievement-veteran",
    slug: "veteran",
    name: "Veteran",
    description: "Answer 1,000 challenges.",
    icon: "medal",
    criteria: "challenges_answered",
    value: 1000,
  },
  {
    id: "achievement-untouchable",
    slug: "untouchable",
    name: "Untouchable",
    description: "Reach a 30-day Daily streak.",
    icon: "flame",
    criteria: "daily_streak",
    value: 30,
  },
];

export function longestObjectiveCorrectStreak(responses: ResponseRecord[]): number {
  let current = 0;
  let longest = 0;
  for (const response of responses) {
    if (response.challengeType !== "objective") continue;
    current = response.isCorrect ? current + 1 : 0;
    longest = Math.max(longest, current);
  }
  return longest;
}

export function achievementSatisfied(
  definition: AchievementDefinition,
  responses: ResponseRecord[],
  dailyStreak: number,
): boolean {
  switch (definition.criteria) {
    case "parking_correct":
      return responses.filter(
        (response) => response.category === "Parking IQ" && response.isCorrect,
      ).length >= definition.value;
    case "spot_correct":
      return responses.filter(
        (response) => response.category === "Spot It" && response.isCorrect,
      ).length >= definition.value;
    case "objective_correct_streak":
      return longestObjectiveCorrectStreak(responses) >= definition.value;
    case "challenges_answered":
      return responses.length >= definition.value;
    case "daily_streak":
      return dailyStreak >= definition.value;
  }
}

export function evaluateAchievements(
  responses: ResponseRecord[],
  dailyStreak: number,
  existingIds: string[],
): AchievementDefinition[] {
  return ACHIEVEMENTS.filter(
    (definition) =>
      !existingIds.includes(definition.id) &&
      achievementSatisfied(definition, responses, dailyStreak),
  );
}

export function earnedAchievementsFromResponses(
  responses: ResponseRecord[],
  dailyStreak: number,
  earnedAt = new Date().toISOString(),
): EarnedAchievement[] {
  return ACHIEVEMENTS.filter((definition) =>
    achievementSatisfied(definition, responses, dailyStreak),
  ).map((definition) => ({ achievementId: definition.id, earnedAt }));
}
