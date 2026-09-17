import { v } from "convex/values";

export const categoryValidator = v.union(
  v.literal("Driver IQ"),
  v.literal("Parking IQ"),
  v.literal("Road IQ"),
  v.literal("Who's Wrong?"),
  v.literal("Car IQ"),
  v.literal("Spot It"),
);

export const difficultyValidator = v.union(
  v.literal("Easy"),
  v.literal("Medium"),
  v.literal("Hard"),
  v.literal("Expert"),
);

export const challengeTypeValidator = v.union(
  v.literal("objective"),
  v.literal("community"),
);

export const providerValidator = v.union(v.literal("mock"), v.literal("gemini"));

export const answerPercentageValidator = v.object({
  answerId: v.string(),
  count: v.number(),
  percentage: v.number(),
});

export const rankValidator = v.object({
  name: v.string(),
  threshold: v.number(),
  nextName: v.union(v.string(), v.null()),
  nextThreshold: v.union(v.number(), v.null()),
  progress: v.number(),
  calibrated: v.boolean(),
});

export const achievementValidator = v.object({
  id: v.string(),
  slug: v.string(),
  name: v.string(),
  description: v.string(),
  icon: v.string(),
  criteria: v.union(
    v.literal("parking_correct"),
    v.literal("spot_correct"),
    v.literal("objective_correct_streak"),
    v.literal("challenges_answered"),
    v.literal("daily_streak"),
  ),
  value: v.number(),
});

export const publicChallengeValidator = v.object({
  id: v.string(),
  slug: v.string(),
  question: v.string(),
  imageUrl: v.string(),
  imageAlt: v.string(),
  imagePosition: v.string(),
  imageAttribution: v.object({
    provider: v.string(),
    creator: v.string(),
    sourceUrl: v.optional(v.string()),
    licenseNote: v.string(),
  }),
  category: categoryValidator,
  difficulty: difficultyValidator,
  challengeType: challengeTypeValidator,
  explanation: v.string(),
  region: v.string(),
  answers: v.array(v.object({ id: v.string(), text: v.string() })),
});

export const responseRecordValidator = v.object({
  id: v.string(),
  idempotencyKey: v.string(),
  challengeId: v.string(),
  answerId: v.string(),
  challengeType: challengeTypeValidator,
  category: categoryValidator,
  difficulty: difficultyValidator,
  isCorrect: v.union(v.boolean(), v.null()),
  xpAwarded: v.number(),
  answeredAt: v.string(),
});

export const challengeResultValidator = v.object({
  response: responseRecordValidator,
  selectedAnswerId: v.string(),
  correctAnswerId: v.union(v.string(), v.null()),
  isCorrect: v.union(v.boolean(), v.null()),
  percentages: v.array(answerPercentageValidator),
  totalResponses: v.number(),
  majorityAnswerId: v.string(),
  majorityAgreement: v.number(),
  xpAwarded: v.number(),
  totalXp: v.number(),
  roadIqScore: v.number(),
  previousRoadIqScore: v.number(),
  rank: rankValidator,
  newlyEarnedAchievements: v.array(achievementValidator),
});

export const capabilityValidator = v.object({
  canAccessUnlimitedChallenges: v.boolean(),
  canAccessAdvancedStats: v.boolean(),
  canAccessPremiumPacks: v.boolean(),
  isAdFree: v.boolean(),
});

export const entitlementValidator = v.object({
  plan: v.union(v.literal("free"), v.literal("pro")),
  status: v.union(
    v.literal("active"),
    v.literal("grace_period"),
    v.literal("expired"),
    v.literal("cancelled"),
  ),
  expiresAt: v.union(v.number(), v.null()),
  provider: v.union(v.string(), v.null()),
  providerCustomerId: v.union(v.string(), v.null()),
  capabilities: capabilityValidator,
});

export const playerSnapshotValidator = v.object({
  actorId: v.string(),
  username: v.string(),
  roadIqScore: v.number(),
  rank: rankValidator,
  xp: v.number(),
  challengesAnswered: v.number(),
  objectiveAccuracy: v.union(v.number(), v.null()),
  currentStreak: v.number(),
  longestStreak: v.number(),
  categoryPerformance: v.array(v.object({
    category: categoryValidator,
    attempted: v.number(),
    correct: v.number(),
    accuracy: v.union(v.number(), v.null()),
  })),
  achievements: v.array(v.object({ achievementId: v.string(), earnedAt: v.string() })),
  entitlement: entitlementValidator,
});

export const qaPayloadValidator = v.object({
  status: v.union(v.literal("pass"), v.literal("warning"), v.literal("fail")),
  score: v.number(),
  issues: v.array(v.string()),
  confirmedFacts: v.array(v.string()),
  missingFacts: v.array(v.string()),
  contradictions: v.array(v.string()),
  summary: v.string(),
  model: v.string(),
});
