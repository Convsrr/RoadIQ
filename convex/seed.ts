import { v } from "convex/values";
import { mutation } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { recordSeededWorkflowStatuses, type ImageWorkflowStatus } from "./lib/imageWorkflow";
import { achievementValidator, categoryValidator, challengeTypeValidator, difficultyValidator } from "./lib/validators";

const imageSpecInputValidator = v.object({
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
  status: v.union(v.literal("ready"), v.literal("needs_review")),
});

const seedChallengeValidator = v.object({
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
  correctAnswerId: v.union(v.string(), v.null()),
  fixtureVotes: v.record(v.string(), v.number()),
  imageSpec: imageSpecInputValidator,
});

function assertSeedAccess(seedToken: string): void {
  const expected = process.env.ROADIQ_SEED_TOKEN;
  if (!expected || seedToken !== expected) {
    throw new Error("SEED_ACCESS_DENIED");
  }
}

export const importChallenges = mutation({
  args: {
    seedToken: v.string(),
    challenges: v.array(seedChallengeValidator),
    achievements: v.array(achievementValidator),
  },
  returns: v.object({
    insertedChallenges: v.number(),
    updatedChallenges: v.number(),
    seededAchievements: v.number(),
  }),
  handler: async (ctx, args) => {
    assertSeedAccess(args.seedToken);
    if (args.challenges.length === 0 || args.challenges.length > 100 || args.achievements.length > 100) {
      throw new Error("INVALID_SEED_BATCH");
    }
    if (new Set(args.challenges.map((challenge) => challenge.id)).size !== args.challenges.length) {
      throw new Error("DUPLICATE_CHALLENGE_ID");
    }
    const now = Date.now();
    let insertedChallenges = 0;
    let updatedChallenges = 0;
    const insertedWorkflowStatuses: ImageWorkflowStatus[] = [];

    for (const source of args.challenges) {
      if (source.answers.length < 2 || source.answers.length > 8 || !source.answers.every((answer) => answer.id.length > 0 && answer.text.length > 0)) {
        throw new Error("INVALID_CHALLENGE_ANSWERS");
      }
      if (source.challengeType === "objective" && (!source.correctAnswerId || !source.answers.some((answer) => answer.id === source.correctAnswerId))) {
        throw new Error("INVALID_OBJECTIVE_KEY");
      }
      if (source.challengeType === "community" && source.correctAnswerId !== null) {
        throw new Error("COMMUNITY_CHALLENGE_HAS_KEY");
      }

      const existing = await ctx.db
        .query("challenges")
        .withIndex("by_stable_id", (q) => q.eq("stableId", source.id))
        .unique();
      const initialWorkflowStatus: ImageWorkflowStatus = source.imageUrl ? "legacy" : "missing";
      const sourceFields = {
        slug: source.slug,
        question: source.question,
        category: source.category,
        difficulty: source.difficulty,
        challengeType: source.challengeType,
        region: source.region,
        explanation: source.explanation,
        imageAlt: source.imageAlt,
        imagePosition: source.imagePosition,
        legacyImageProvider: source.imageAttribution.provider,
        legacyImageCreator: source.imageAttribution.creator,
        legacyImageLicenseNote: source.imageAttribution.licenseNote,
        updatedAt: now,
        ...(source.imageUrl ? { legacyImageUrl: source.imageUrl } : {}),
        ...(source.imageAttribution.sourceUrl ? { legacyImageSourceUrl: source.imageAttribution.sourceUrl } : {}),
      };
      const challengeId = existing
        ? existing._id
        : await ctx.db.insert("challenges", {
            stableId: source.id,
            ...sourceFields,
            status: "published",
            publishedAt: now,
            imageWorkflowStatus: initialWorkflowStatus,
            createdAt: now,
          });
      if (existing) {
        await ctx.db.patch(challengeId, sourceFields);
        updatedChallenges += 1;
      } else {
        insertedChallenges += 1;
        insertedWorkflowStatuses.push(initialWorkflowStatus);
      }
      const challenge = (await ctx.db.get(challengeId))!;

      const answerIds = new Map<string, Id<"challengeAnswers">>();
      for (const [sortOrder, answer] of source.answers.entries()) {
        const known = await ctx.db
          .query("challengeAnswers")
          .withIndex("by_stable_id", (q) => q.eq("stableId", answer.id))
          .unique();
        if (known && known.challengeId !== challengeId) throw new Error("ANSWER_ID_CONFLICT");
        const answerId = known
          ? known._id
          : await ctx.db.insert("challengeAnswers", {
              challengeId,
              stableId: answer.id,
              text: answer.text,
              sortOrder,
            });
        if (known) await ctx.db.patch(answerId, { text: answer.text, sortOrder });
        answerIds.set(answer.id, answerId);
      }

      const key = await ctx.db
        .query("objectiveAnswerKeys")
        .withIndex("by_challenge_id", (q) => q.eq("challengeId", challengeId))
        .unique();
      if (source.correctAnswerId) {
        const answerId = answerIds.get(source.correctAnswerId);
        if (!answerId) throw new Error("OBJECTIVE_KEY_ANSWER_MISSING");
        if (key) await ctx.db.patch(key._id, { answerId, updatedAt: now });
        else await ctx.db.insert("objectiveAnswerKeys", { challengeId, answerId, createdAt: now, updatedAt: now });
      } else if (key) {
        await ctx.db.delete(key._id);
      }

      const stats = await ctx.db
        .query("challengeStats")
        .withIndex("by_challenge_id", (q) => q.eq("challengeId", challengeId))
        .unique();
      if (!stats) {
        const answerCounts = Object.fromEntries(source.answers.map((answer) => [answer.id, Math.max(0, Math.floor(source.fixtureVotes[answer.id] ?? 0))]));
        await ctx.db.insert("challengeStats", {
          challengeId,
          answerCounts,
          totalResponses: Object.values(answerCounts).reduce((sum, count) => sum + count, 0),
          updatedAt: now,
        });
      }

      const spec = await ctx.db
        .query("imageSpecs")
        .withIndex("by_challenge_id", (q) => q.eq("challengeId", challengeId))
        .unique();
      if (!spec) {
        await ctx.db.insert("imageSpecs", {
          challengeId,
          ...source.imageSpec,
          promptVersion: 1,
          createdAt: now,
          updatedAt: now,
        });
      } else if (spec.promptVersion <= 1) {
        // Upgrade the initial generated brief on re-seed without overwriting
        // an operator-edited spec, which always has a later prompt version.
        await ctx.db.patch(spec._id, {
          ...source.imageSpec,
          promptVersion: spec.promptVersion + 1,
          updatedAt: now,
        });
      }

      const activeAsset = challenge.activeAssetId
        ? await ctx.db.get(challenge.activeAssetId)
        : await ctx.db
            .query("challengeAssets")
            .withIndex("by_challenge_id_and_is_active", (q) => q.eq("challengeId", challengeId).eq("isActive", true))
            .unique();
      if (!activeAsset && source.imageUrl) {
        const asset = await ctx.db.insert("challengeAssets", {
          challengeId,
          version: 1,
          sourceType: "legacy",
          externalUrl: source.imageUrl,
          imageAlt: source.imageAlt,
          imagePosition: source.imagePosition,
          isActive: true,
          publishedAt: now,
          createdAt: now,
        });
        await ctx.db.patch(challengeId, { activeAssetId: asset, updatedAt: now });
      }
    }

    let seededAchievements = 0;
    for (const achievement of args.achievements) {
      const existing = await ctx.db
        .query("achievements")
        .withIndex("by_stable_id", (q) => q.eq("stableId", achievement.id))
        .unique();
      if (existing) {
        await ctx.db.patch(existing._id, {
          slug: achievement.slug,
          name: achievement.name,
          description: achievement.description,
          icon: achievement.icon,
          criteria: achievement.criteria,
          value: achievement.value,
        });
      } else {
        await ctx.db.insert("achievements", {
          stableId: achievement.id,
          slug: achievement.slug,
          name: achievement.name,
          description: achievement.description,
          icon: achievement.icon,
          criteria: achievement.criteria,
          value: achievement.value,
          createdAt: now,
        });
        seededAchievements += 1;
      }
    }
    await recordSeededWorkflowStatuses(ctx, insertedWorkflowStatuses, now);
    return { insertedChallenges, updatedChallenges, seededAchievements };
  },
});
