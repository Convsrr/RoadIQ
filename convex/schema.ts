import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const categoryValidator = v.union(
  v.literal("Driver IQ"),
  v.literal("Parking IQ"),
  v.literal("Road IQ"),
  v.literal("Who's Wrong?"),
  v.literal("Car IQ"),
  v.literal("Spot It"),
);

const difficultyValidator = v.union(
  v.literal("Easy"),
  v.literal("Medium"),
  v.literal("Hard"),
  v.literal("Expert"),
);

const challengeTypeValidator = v.union(
  v.literal("objective"),
  v.literal("community"),
);

const challengeStatusValidator = v.union(
  v.literal("draft"),
  v.literal("published"),
  v.literal("archived"),
);

const imageWorkflowStatusValidator = v.union(
  v.literal("missing"),
  v.literal("legacy"),
  v.literal("generating"),
  v.literal("pending_qa"),
  v.literal("qa_pass"),
  v.literal("qa_warning"),
  v.literal("qa_fail"),
  v.literal("approved"),
  v.literal("published"),
);

const planValidator = v.union(v.literal("free"), v.literal("pro"));
const entitlementStatusValidator = v.union(
  v.literal("active"),
  v.literal("grace_period"),
  v.literal("expired"),
  v.literal("cancelled"),
);
const providerValidator = v.union(v.literal("mock"), v.literal("gemini"));
const qaStatusValidator = v.union(
  v.literal("pending"),
  v.literal("pass"),
  v.literal("warning"),
  v.literal("fail"),
);

export default defineSchema({
  users: defineTable({
    anonymousId: v.string(),
    tokenIdentifier: v.optional(v.string()),
    username: v.string(),
    isAnonymous: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_anonymous_id", ["anonymousId"])
    .index("by_token_identifier", ["tokenIdentifier"]),

  challenges: defineTable({
    stableId: v.string(),
    slug: v.string(),
    question: v.string(),
    category: categoryValidator,
    difficulty: difficultyValidator,
    challengeType: challengeTypeValidator,
    region: v.string(),
    explanation: v.string(),
    status: challengeStatusValidator,
    publishedAt: v.optional(v.number()),
    imageAlt: v.string(),
    imagePosition: v.string(),
    imageWorkflowStatus: imageWorkflowStatusValidator,
    activeAssetId: v.optional(v.id("challengeAssets")),
    legacyImageUrl: v.optional(v.string()),
    legacyImageProvider: v.optional(v.string()),
    legacyImageCreator: v.optional(v.string()),
    legacyImageSourceUrl: v.optional(v.string()),
    legacyImageLicenseNote: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_stable_id", ["stableId"])
    .index("by_slug", ["slug"])
    .index("by_status_and_published_at", ["status", "publishedAt"])
    .index("by_status_and_category_and_difficulty", ["status", "category", "difficulty"])
    .index("by_status_and_difficulty", ["status", "difficulty"])
    .index("by_status_and_image_workflow_status", ["status", "imageWorkflowStatus"])
    .index("by_updated_at", ["updatedAt"]),

  challengeAnswers: defineTable({
    challengeId: v.id("challenges"),
    stableId: v.string(),
    text: v.string(),
    sortOrder: v.number(),
  })
    .index("by_challenge_id_and_sort_order", ["challengeId", "sortOrder"])
    .index("by_stable_id", ["stableId"]),

  objectiveAnswerKeys: defineTable({
    challengeId: v.id("challenges"),
    answerId: v.id("challengeAnswers"),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_challenge_id", ["challengeId"]),

  challengeResponses: defineTable({
    userId: v.id("users"),
    challengeId: v.id("challenges"),
    answerId: v.id("challengeAnswers"),
    idempotencyKey: v.string(),
    challengeType: challengeTypeValidator,
    category: categoryValidator,
    difficulty: difficultyValidator,
    isCorrect: v.union(v.boolean(), v.null()),
    xpAwarded: v.number(),
    answeredAt: v.number(),
  })
    .index("by_user_id", ["userId"])
    .index("by_user_id_and_challenge_id", ["userId", "challengeId"])
    .index("by_user_id_and_idempotency_key", ["userId", "idempotencyKey"])
    .index("by_user_id_and_answered_at", ["userId", "answeredAt"]),

  challengeStats: defineTable({
    challengeId: v.id("challenges"),
    totalResponses: v.number(),
    answerCounts: v.record(v.string(), v.number()),
    updatedAt: v.number(),
  }).index("by_challenge_id", ["challengeId"]),

  dailyChallenges: defineTable({
    date: v.string(),
    challengeIds: v.array(v.id("challenges")),
    createdAt: v.number(),
  }).index("by_date", ["date"]),

  dailyCompletions: defineTable({
    userId: v.id("users"),
    dailyChallengeId: v.id("dailyChallenges"),
    date: v.string(),
    xpAwarded: v.number(),
    completedAt: v.number(),
  })
    .index("by_user_id", ["userId"])
    .index("by_user_id_and_date", ["userId", "date"]),

  playerStats: defineTable({
    userId: v.id("users"),
    xp: v.number(),
    roadIqScore: v.number(),
    objectiveAttempts: v.number(),
    challengesAnswered: v.number(),
    currentStreak: v.number(),
    longestStreak: v.number(),
    weeklyXp: v.number(),
    weeklyPeriod: v.string(),
    updatedAt: v.number(),
  })
    .index("by_user_id", ["userId"])
    .index("by_xp", ["xp"])
    .index("by_road_iq_score", ["roadIqScore"])
    .index("by_weekly_period_and_xp", ["weeklyPeriod", "weeklyXp"]),

  achievements: defineTable({
    stableId: v.string(),
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
    createdAt: v.number(),
  })
    .index("by_stable_id", ["stableId"])
    .index("by_slug", ["slug"]),

  playerAchievements: defineTable({
    userId: v.id("users"),
    achievementId: v.id("achievements"),
    earnedAt: v.number(),
  })
    .index("by_user_id", ["userId"])
    .index("by_user_id_and_achievement_id", ["userId", "achievementId"]),

  reactions: defineTable({
    userId: v.id("users"),
    challengeId: v.id("challenges"),
    reaction: v.union(v.literal("positive"), v.literal("negative")),
    updatedAt: v.number(),
  }).index("by_user_id_and_challenge_id", ["userId", "challengeId"]),

  analyticsEvents: defineTable({
    userId: v.id("users"),
    challengeId: v.optional(v.id("challenges")),
    name: v.string(),
    occurredAt: v.number(),
    context: v.optional(v.record(v.string(), v.union(v.string(), v.number(), v.boolean(), v.null()))),
  })
    .index("by_user_id_and_occurred_at", ["userId", "occurredAt"])
    .index("by_name_and_occurred_at", ["name", "occurredAt"]),

  entitlements: defineTable({
    userId: v.id("users"),
    plan: planValidator,
    status: entitlementStatusValidator,
    expiresAt: v.optional(v.number()),
    provider: v.optional(v.string()),
    providerCustomerId: v.optional(v.string()),
    updatedAt: v.number(),
  }).index("by_user_id", ["userId"]),

  imageSpecs: defineTable({
    challengeId: v.id("challenges"),
    styleProfile: v.string(),
    camera: v.string(),
    scene: v.string(),
    roadEnvironment: v.string(),
    composition: v.string(),
    mustShow: v.array(v.string()),
    mustNotShow: v.array(v.string()),
    criticalFacts: v.array(v.string()),
    regionRules: v.array(v.string()),
    prompt: v.string(),
    negativePrompt: v.string(),
    candidateCount: v.number(),
    status: v.union(v.literal("draft"), v.literal("ready"), v.literal("needs_review")),
    promptVersion: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_challenge_id", ["challengeId"]),

  imageGenerationBatches: defineTable({
    provider: providerValidator,
    model: v.string(),
    candidateCount: v.number(),
    filterMode: v.union(
      v.literal("missing"),
      v.literal("selected"),
      v.literal("category"),
      v.literal("difficulty"),
      v.literal("failed_qa"),
      v.literal("unapproved"),
    ),
    challengeIds: v.array(v.id("challenges")),
    status: v.union(
      v.literal("queued"),
      v.literal("running"),
      v.literal("completed"),
      v.literal("completed_with_errors"),
      v.literal("failed"),
    ),
    nextChallengeIndex: v.number(),
    processedChallenges: v.number(),
    generatedCandidates: v.number(),
    qaPassed: v.number(),
    qaFailed: v.number(),
    errors: v.array(v.object({ challengeId: v.string(), message: v.string(), occurredAt: v.number() })),
    createdAt: v.number(),
    updatedAt: v.number(),
    completedAt: v.optional(v.number()),
  }).index("by_status_and_created_at", ["status", "createdAt"]),

  imageCandidates: defineTable({
    challengeId: v.id("challenges"),
    batchId: v.id("imageGenerationBatches"),
    storageId: v.id("_storage"),
    provider: providerValidator,
    model: v.string(),
    promptVersion: v.number(),
    candidateIndex: v.number(),
    createdAt: v.number(),
    width: v.number(),
    height: v.number(),
    qaStatus: qaStatusValidator,
    approvalStatus: v.union(v.literal("pending"), v.literal("approved"), v.literal("rejected")),
    approvalNotes: v.optional(v.string()),
  })
    .index("by_challenge_id_and_created_at", ["challengeId", "createdAt"])
    .index("by_batch_id_and_created_at", ["batchId", "createdAt"])
    .index("by_batch_id_and_challenge_id_and_candidate_index", ["batchId", "challengeId", "candidateIndex"])
    .index("by_qa_status_and_created_at", ["qaStatus", "createdAt"])
    .index("by_approval_status_and_created_at", ["approvalStatus", "createdAt"]),

  imageQaResults: defineTable({
    candidateId: v.id("imageCandidates"),
    status: v.union(v.literal("pass"), v.literal("warning"), v.literal("fail")),
    score: v.number(),
    issues: v.array(v.string()),
    confirmedFacts: v.array(v.string()),
    missingFacts: v.array(v.string()),
    contradictions: v.array(v.string()),
    summary: v.string(),
    model: v.string(),
    createdAt: v.number(),
  }).index("by_candidate_id_and_created_at", ["candidateId", "createdAt"]),

  imageGenerationBatchResults: defineTable({
    batchId: v.id("imageGenerationBatches"),
    challengeId: v.id("challenges"),
    status: v.union(v.literal("completed"), v.literal("error")),
    generatedCandidates: v.number(),
    qaPassed: v.number(),
    qaFailed: v.number(),
    qaWarnings: v.number(),
    error: v.optional(v.string()),
    processedAt: v.number(),
  }).index("by_batch_id_and_challenge_id", ["batchId", "challengeId"]),

  challengeAssets: defineTable({
    challengeId: v.id("challenges"),
    version: v.number(),
    sourceType: v.union(v.literal("legacy"), v.literal("generated")),
    storageId: v.optional(v.id("_storage")),
    externalUrl: v.optional(v.string()),
    candidateId: v.optional(v.id("imageCandidates")),
    imageAlt: v.string(),
    imagePosition: v.string(),
    isActive: v.boolean(),
    publishedAt: v.optional(v.number()),
    rolledBackAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_challenge_id_and_version", ["challengeId", "version"])
    .index("by_challenge_id_and_is_active", ["challengeId", "isActive"]),

  imageFactoryMetrics: defineTable({
    key: v.string(),
    totalChallenges: v.number(),
    missing: v.number(),
    legacy: v.number(),
    generating: v.number(),
    pendingQa: v.number(),
    qaPass: v.number(),
    qaWarning: v.number(),
    qaFail: v.number(),
    approved: v.number(),
    published: v.number(),
    updatedAt: v.number(),
  }).index("by_key", ["key"]),
});
