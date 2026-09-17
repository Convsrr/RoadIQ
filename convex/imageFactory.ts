import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalMutation, internalQuery, mutation, query, type QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import {
  IMAGE_FACTORY_METRICS_KEY,
  canApproveCandidate,
  canPublishCandidate,
  isRollbackTargetForChallenge,
  nextAssetVersion,
  nextBatchStatus,
  replaceImageWorkflowMetrics,
  updateImageWorkflowStatus,
  workflowStatusForBatchResult,
  type ImageWorkflowStatus,
} from "./lib/imageWorkflow";
import { categoryValidator, difficultyValidator, providerValidator, qaPayloadValidator } from "./lib/validators";

const imageSpecValidator = v.object({
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
  updatedAt: v.number(),
});

const candidateViewValidator = v.object({
  id: v.string(),
  imageUrl: v.string(),
  provider: providerValidator,
  model: v.string(),
  promptVersion: v.number(),
  candidateIndex: v.number(),
  qaStatus: v.union(v.literal("pending"), v.literal("pass"), v.literal("warning"), v.literal("fail")),
  approvalStatus: v.union(v.literal("pending"), v.literal("approved"), v.literal("rejected")),
  approvalNotes: v.union(v.string(), v.null()),
  qa: v.union(qaPayloadValidator, v.null()),
  createdAt: v.number(),
});

const assetViewValidator = v.object({
  id: v.string(),
  version: v.number(),
  sourceType: v.union(v.literal("legacy"), v.literal("generated")),
  imageUrl: v.string(),
  imageAlt: v.string(),
  imagePosition: v.string(),
  isActive: v.boolean(),
  publishedAt: v.union(v.number(), v.null()),
});

const reviewItemValidator = v.object({
  id: v.string(),
  question: v.string(),
  answers: v.array(v.object({ id: v.string(), text: v.string() })),
  correctAnswerId: v.union(v.string(), v.null()),
  category: categoryValidator,
  difficulty: difficultyValidator,
  challengeType: v.union(v.literal("objective"), v.literal("community")),
  imageWorkflowStatus: v.union(
    v.literal("missing"), v.literal("legacy"), v.literal("generating"), v.literal("pending_qa"),
    v.literal("qa_pass"), v.literal("qa_warning"), v.literal("qa_fail"), v.literal("approved"), v.literal("published"),
  ),
  currentImage: v.union(assetViewValidator, v.null()),
  spec: v.union(imageSpecValidator, v.null()),
  candidates: v.array(candidateViewValidator),
  assets: v.array(assetViewValidator),
  imageAlt: v.string(),
  imagePosition: v.string(),
});

const metricsValidator = v.object({
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
});

const batchFilterValidator = v.union(
  v.literal("missing"),
  v.literal("selected"),
  v.literal("category"),
  v.literal("difficulty"),
  v.literal("failed_qa"),
  v.literal("unapproved"),
);

const batchStatusValidator = v.union(
  v.literal("queued"),
  v.literal("running"),
  v.literal("completed"),
  v.literal("completed_with_errors"),
  v.literal("failed"),
);

function requireOperator(operatorToken: string): void {
  const expected = process.env.ROADIQ_IMAGE_FACTORY_TOKEN;
  if (process.env.ROADIQ_IMAGE_FACTORY_ENABLED !== "1" || !expected || operatorToken !== expected) {
    throw new Error("IMAGE_FACTORY_ACCESS_DENIED");
  }
}

function configuredProvider(): "mock" | "gemini" {
  return process.env.ROADIQ_IMAGE_PROVIDER === "gemini" ? "gemini" : "mock";
}

function modelFor(provider: "mock" | "gemini", requested?: string): string {
  if (requested) return requested;
  return provider === "gemini"
    ? process.env.ROADIQ_IMAGE_MODEL ?? "gemini-3.1-flash-image"
    : "mock-road-iq-v1";
}

async function imageUrl(ctx: QueryCtx, asset: { storageId?: Id<"_storage">; externalUrl?: string } | null): Promise<string> {
  if (!asset) return "";
  return asset.storageId ? (await ctx.storage.getUrl(asset.storageId)) ?? "" : asset.externalUrl ?? "";
}

async function assetView(ctx: QueryCtx, asset: Doc<"challengeAssets">) {
  return {
    id: asset._id,
    version: asset.version,
    sourceType: asset.sourceType,
    imageUrl: await imageUrl(ctx, asset),
    imageAlt: asset.imageAlt,
    imagePosition: asset.imagePosition,
    isActive: asset.isActive,
    publishedAt: asset.publishedAt ?? null,
  };
}

async function candidateView(ctx: QueryCtx, candidate: Doc<"imageCandidates">) {
  const latestQa = await ctx.db
    .query("imageQaResults")
    .withIndex("by_candidate_id_and_created_at", (q) => q.eq("candidateId", candidate._id))
    .order("desc")
    .first();
  return {
    id: candidate._id,
    imageUrl: (await ctx.storage.getUrl(candidate.storageId)) ?? "",
    provider: candidate.provider,
    model: candidate.model,
    promptVersion: candidate.promptVersion,
    candidateIndex: candidate.candidateIndex,
    qaStatus: candidate.qaStatus,
    approvalStatus: candidate.approvalStatus,
    approvalNotes: candidate.approvalNotes ?? null,
    qa: latestQa ? {
      status: latestQa.status,
      score: latestQa.score,
      issues: latestQa.issues,
      confirmedFacts: latestQa.confirmedFacts,
      missingFacts: latestQa.missingFacts,
      contradictions: latestQa.contradictions,
      summary: latestQa.summary,
      model: latestQa.model,
    } : null,
    createdAt: candidate.createdAt,
  };
}

async function reviewItem(ctx: QueryCtx, challenge: Doc<"challenges">) {
  const [answers, key, spec, candidates, assets] = await Promise.all([
    ctx.db.query("challengeAnswers").withIndex("by_challenge_id_and_sort_order", (q) => q.eq("challengeId", challenge._id)).order("asc").take(8),
    challenge.challengeType === "objective"
      ? ctx.db.query("objectiveAnswerKeys").withIndex("by_challenge_id", (q) => q.eq("challengeId", challenge._id)).unique()
      : null,
    ctx.db.query("imageSpecs").withIndex("by_challenge_id", (q) => q.eq("challengeId", challenge._id)).unique(),
    ctx.db.query("imageCandidates").withIndex("by_challenge_id_and_created_at", (q) => q.eq("challengeId", challenge._id)).order("desc").take(12),
    ctx.db.query("challengeAssets").withIndex("by_challenge_id_and_version", (q) => q.eq("challengeId", challenge._id)).order("desc").take(20),
  ]);
  const correctAnswer = key ? await ctx.db.get(key.answerId) : null;
  const active = challenge.activeAssetId
    ? await ctx.db.get(challenge.activeAssetId)
    : assets.find((asset) => asset.isActive) ?? null;
  return {
    id: challenge.stableId,
    question: challenge.question,
    answers: answers.map((answer) => ({ id: answer.stableId, text: answer.text })),
    correctAnswerId: correctAnswer?.stableId ?? null,
    category: challenge.category,
    difficulty: challenge.difficulty,
    challengeType: challenge.challengeType,
    imageWorkflowStatus: challenge.imageWorkflowStatus,
    currentImage: active ? await assetView(ctx, active) : null,
    spec: spec ? {
      styleProfile: spec.styleProfile,
      camera: spec.camera,
      scene: spec.scene,
      roadEnvironment: spec.roadEnvironment,
      composition: spec.composition,
      mustShow: spec.mustShow,
      mustNotShow: spec.mustNotShow,
      criticalFacts: spec.criticalFacts,
      regionRules: spec.regionRules,
      prompt: spec.prompt,
      negativePrompt: spec.negativePrompt,
      candidateCount: spec.candidateCount,
      status: spec.status,
      promptVersion: spec.promptVersion,
      updatedAt: spec.updatedAt,
    } : null,
    candidates: await Promise.all(candidates.map((candidate) => candidateView(ctx, candidate))),
    assets: await Promise.all(assets.map((asset) => assetView(ctx, asset))),
    imageAlt: challenge.imageAlt,
    imagePosition: challenge.imagePosition,
  };
}

export const getDashboard = query({
  args: {
    operatorToken: v.string(),
    paginationOpts: paginationOptsValidator,
  },
  returns: v.object({
    metrics: metricsValidator,
    page: v.array(reviewItemValidator),
    isDone: v.boolean(),
    continueCursor: v.string(),
  }),
  handler: async (ctx, args) => {
    requireOperator(args.operatorToken);
    const [metrics, result] = await Promise.all([
      ctx.db.query("imageFactoryMetrics").withIndex("by_key", (q) => q.eq("key", IMAGE_FACTORY_METRICS_KEY)).unique(),
      ctx.db.query("challenges").withIndex("by_updated_at").order("desc").paginate(args.paginationOpts),
    ]);
    return {
      metrics: metrics ? {
        totalChallenges: metrics.totalChallenges,
        missing: metrics.missing,
        legacy: metrics.legacy,
        generating: metrics.generating,
        pendingQa: metrics.pendingQa,
        qaPass: metrics.qaPass,
        qaWarning: metrics.qaWarning,
        qaFail: metrics.qaFail,
        approved: metrics.approved,
        published: metrics.published,
        updatedAt: metrics.updatedAt,
      } : {
        totalChallenges: 0, missing: 0, legacy: 0, generating: 0, pendingQa: 0,
        qaPass: 0, qaWarning: 0, qaFail: 0, approved: 0, published: 0, updatedAt: 0,
      },
      page: await Promise.all(result.page.map((challenge) => reviewItem(ctx, challenge))),
      isDone: result.isDone,
      continueCursor: result.continueCursor,
    };
  },
});

export const startBatch = mutation({
  args: {
    operatorToken: v.string(),
    filterMode: batchFilterValidator,
    challengeStableIds: v.optional(v.array(v.string())),
    category: v.optional(categoryValidator),
    difficulty: v.optional(difficultyValidator),
    provider: v.optional(providerValidator),
    model: v.optional(v.string()),
    candidateCount: v.optional(v.number()),
  },
  returns: v.object({ batchId: v.string(), challengeCount: v.number(), provider: providerValidator, model: v.string() }),
  handler: async (ctx, args) => {
    requireOperator(args.operatorToken);
    const provider = args.provider ?? configuredProvider();
    if (provider === "gemini" && !process.env.GEMINI_API_KEY) throw new Error("GEMINI_NOT_CONFIGURED");
    const candidateCount = args.candidateCount ?? 3;
    if (!Number.isInteger(candidateCount) || candidateCount < 1 || candidateCount > 4) throw new Error("INVALID_CANDIDATE_COUNT");
    const targets: Doc<"challenges">[] = [];
    const targetIds = new Set<string>();
    const addUnique = (rows: Doc<"challenges">[]) => {
      for (const row of rows) {
        if (!targetIds.has(row._id)) {
          targetIds.add(row._id);
          targets.push(row);
        }
      }
    };
    if (args.filterMode === "selected") {
      if (!args.challengeStableIds?.length || args.challengeStableIds.length > 500) throw new Error("INVALID_SELECTED_CHALLENGES");
      for (const stableId of [...new Set(args.challengeStableIds)]) {
        const challenge = await ctx.db.query("challenges").withIndex("by_stable_id", (q) => q.eq("stableId", stableId)).unique();
        if (challenge?.status === "published") addUnique([challenge]);
      }
    } else if (args.filterMode === "category") {
      if (!args.category) throw new Error("CATEGORY_REQUIRED");
      const rows = args.difficulty
        ? await ctx.db.query("challenges").withIndex("by_status_and_category_and_difficulty", (q) => q.eq("status", "published").eq("category", args.category!).eq("difficulty", args.difficulty!)).take(5_000)
        : await ctx.db.query("challenges").withIndex("by_status_and_category_and_difficulty", (q) => q.eq("status", "published").eq("category", args.category!)).take(5_000);
      addUnique(rows);
    } else if (args.filterMode === "difficulty") {
      if (!args.difficulty) throw new Error("DIFFICULTY_REQUIRED");
      addUnique(await ctx.db.query("challenges").withIndex("by_status_and_difficulty", (q) => q.eq("status", "published").eq("difficulty", args.difficulty!)).take(5_000));
    } else {
      const statuses: ImageWorkflowStatus[] = args.filterMode === "missing"
        ? ["missing", "legacy"]
        : args.filterMode === "failed_qa"
          ? ["qa_fail"]
          : ["missing", "legacy", "pending_qa", "qa_pass", "qa_warning", "qa_fail", "approved"];
      for (const status of statuses) {
        addUnique(await ctx.db.query("challenges").withIndex("by_status_and_image_workflow_status", (q) => q.eq("status", "published").eq("imageWorkflowStatus", status)).take(5_000));
        if (targets.length >= 5_000) break;
      }
    }
    const challengeIds = targets.slice(0, 5_000).map((challenge) => challenge._id);
    if (challengeIds.length === 0) throw new Error("NO_CHALLENGES_MATCHED");
    const now = Date.now();
    const batchId = await ctx.db.insert("imageGenerationBatches", {
      provider,
      model: modelFor(provider, args.model),
      candidateCount,
      filterMode: args.filterMode,
      challengeIds,
      status: "queued",
      nextChallengeIndex: 0,
      processedChallenges: 0,
      generatedCandidates: 0,
      qaPassed: 0,
      qaFailed: 0,
      errors: [],
      createdAt: now,
      updatedAt: now,
    });
    await ctx.scheduler.runAfter(0, internal.imageGeneration.processNext, { batchId });
    return { batchId, challengeCount: challengeIds.length, provider, model: modelFor(provider, args.model) };
  },
});

export const updateSpec = mutation({
  args: {
    operatorToken: v.string(),
    challengeId: v.string(),
    styleProfile: v.optional(v.string()),
    camera: v.optional(v.string()),
    scene: v.optional(v.string()),
    roadEnvironment: v.optional(v.string()),
    composition: v.optional(v.string()),
    mustShow: v.optional(v.array(v.string())),
    mustNotShow: v.optional(v.array(v.string())),
    criticalFacts: v.optional(v.array(v.string())),
    regionRules: v.optional(v.array(v.string())),
    prompt: v.optional(v.string()),
    negativePrompt: v.optional(v.string()),
    candidateCount: v.optional(v.number()),
    status: v.optional(v.union(v.literal("draft"), v.literal("ready"), v.literal("needs_review"))),
    imageAlt: v.optional(v.string()),
    imagePosition: v.optional(v.string()),
  },
  returns: v.object({ updated: v.boolean() }),
  handler: async (ctx, args) => {
    requireOperator(args.operatorToken);
    const challenge = await ctx.db.query("challenges").withIndex("by_stable_id", (q) => q.eq("stableId", args.challengeId)).unique();
    if (!challenge) throw new Error("CHALLENGE_NOT_FOUND");
    const spec = await ctx.db.query("imageSpecs").withIndex("by_challenge_id", (q) => q.eq("challengeId", challenge._id)).unique();
    if (!spec) throw new Error("IMAGE_SPEC_NOT_FOUND");
    if (args.candidateCount !== undefined && (!Number.isInteger(args.candidateCount) || args.candidateCount < 1 || args.candidateCount > 4)) {
      throw new Error("INVALID_CANDIDATE_COUNT");
    }
    const nextSpec = {
      styleProfile: args.styleProfile ?? spec.styleProfile,
      camera: args.camera ?? spec.camera,
      scene: args.scene ?? spec.scene,
      roadEnvironment: args.roadEnvironment ?? spec.roadEnvironment,
      composition: args.composition ?? spec.composition,
      mustShow: args.mustShow ?? spec.mustShow,
      mustNotShow: args.mustNotShow ?? spec.mustNotShow,
      criticalFacts: args.criticalFacts ?? spec.criticalFacts,
      regionRules: args.regionRules ?? spec.regionRules,
      prompt: args.prompt ?? spec.prompt,
      negativePrompt: args.negativePrompt ?? spec.negativePrompt,
      candidateCount: args.candidateCount ?? spec.candidateCount,
      status: args.status ?? spec.status,
      promptVersion: spec.promptVersion + 1,
      updatedAt: Date.now(),
    };
    await ctx.db.patch(spec._id, nextSpec);
    if (args.imageAlt !== undefined || args.imagePosition !== undefined) {
      await ctx.db.patch(challenge._id, {
        imageAlt: args.imageAlt ?? challenge.imageAlt,
        imagePosition: args.imagePosition ?? challenge.imagePosition,
        updatedAt: nextSpec.updatedAt,
      });
    }
    return { updated: true };
  },
});

export const approveCandidate = mutation({
  args: { operatorToken: v.string(), candidateId: v.id("imageCandidates"), notes: v.optional(v.string()) },
  returns: v.object({ approved: v.boolean() }),
  handler: async (ctx, args) => {
    requireOperator(args.operatorToken);
    const candidate = await ctx.db.get(args.candidateId);
    if (!candidate) throw new Error("CANDIDATE_NOT_FOUND");
    if (!canApproveCandidate(candidate.qaStatus)) throw new Error("QA_NOT_COMPLETE");
    const challenge = await ctx.db.get(candidate.challengeId);
    if (!challenge) throw new Error("CHALLENGE_NOT_FOUND");
    const now = Date.now();
    await ctx.db.patch(candidate._id, { approvalStatus: "approved", approvalNotes: args.notes, });
    await updateImageWorkflowStatus(ctx, challenge, "approved", now);
    return { approved: true };
  },
});

export const rejectCandidate = mutation({
  args: { operatorToken: v.string(), candidateId: v.id("imageCandidates"), notes: v.optional(v.string()) },
  returns: v.object({ rejected: v.boolean() }),
  handler: async (ctx, args) => {
    requireOperator(args.operatorToken);
    const candidate = await ctx.db.get(args.candidateId);
    if (!candidate) throw new Error("CANDIDATE_NOT_FOUND");
    const challenge = await ctx.db.get(candidate.challengeId);
    if (!challenge) throw new Error("CHALLENGE_NOT_FOUND");
    await ctx.db.patch(candidate._id, { approvalStatus: "rejected", approvalNotes: args.notes });
    if (challenge.imageWorkflowStatus === "approved") await updateImageWorkflowStatus(ctx, challenge, "qa_warning");
    return { rejected: true };
  },
});

export const publishCandidate = mutation({
  args: { operatorToken: v.string(), candidateId: v.id("imageCandidates") },
  returns: v.object({ assetId: v.string(), version: v.number() }),
  handler: async (ctx, args) => {
    requireOperator(args.operatorToken);
    const candidate = await ctx.db.get(args.candidateId);
    if (!candidate) throw new Error("CANDIDATE_NOT_FOUND");
    if (!canPublishCandidate(candidate.approvalStatus)) throw new Error("CANDIDATE_NOT_APPROVED");
    const challenge = await ctx.db.get(candidate.challengeId);
    if (!challenge) throw new Error("CHALLENGE_NOT_FOUND");
    const now = Date.now();
    const assets = await ctx.db
      .query("challengeAssets")
      .withIndex("by_challenge_id_and_version", (q) => q.eq("challengeId", challenge._id))
      .order("desc")
      .take(1_000);
    const activeAssets = assets.filter((asset) => asset.isActive);
    await Promise.all(activeAssets.map((asset) => ctx.db.patch(asset._id, { isActive: false })));
    const version = nextAssetVersion(assets);
    const assetId = await ctx.db.insert("challengeAssets", {
      challengeId: challenge._id,
      version,
      sourceType: "generated",
      storageId: candidate.storageId,
      candidateId: candidate._id,
      imageAlt: challenge.imageAlt,
      imagePosition: challenge.imagePosition,
      isActive: true,
      publishedAt: now,
      createdAt: now,
    });
    await updateImageWorkflowStatus(ctx, challenge, "published", now);
    await ctx.db.patch(challenge._id, { activeAssetId: assetId, updatedAt: now });
    return { assetId, version };
  },
});

export const rollbackAsset = mutation({
  args: { operatorToken: v.string(), challengeId: v.string(), assetId: v.id("challengeAssets") },
  returns: v.object({ activeAssetId: v.string() }),
  handler: async (ctx, args) => {
    requireOperator(args.operatorToken);
    const [challenge, target] = await Promise.all([
      ctx.db.query("challenges").withIndex("by_stable_id", (q) => q.eq("stableId", args.challengeId)).unique(),
      ctx.db.get(args.assetId),
    ]);
    if (!challenge || !target || !isRollbackTargetForChallenge(challenge._id, target.challengeId)) {
      throw new Error("ASSET_NOT_FOUND");
    }
    const now = Date.now();
    const active = challenge.activeAssetId ? await ctx.db.get(challenge.activeAssetId) : null;
    if (active && active._id !== target._id) await ctx.db.patch(active._id, { isActive: false });
    await ctx.db.patch(target._id, { isActive: true, rolledBackAt: now });
    await updateImageWorkflowStatus(ctx, challenge, "published", now);
    await ctx.db.patch(challenge._id, { activeAssetId: target._id, updatedAt: now });
    return { activeAssetId: target._id };
  },
});

export const rebuildMetrics = mutation({
  args: { operatorToken: v.string() },
  returns: v.object({ rebuilt: v.boolean(), totalChallenges: v.number() }),
  handler: async (ctx, args) => {
    requireOperator(args.operatorToken);
    const challenges = await ctx.db.query("challenges").withIndex("by_updated_at").take(10_000);
    if (challenges.length === 10_000) throw new Error("METRICS_REBUILD_LIMIT");
    await replaceImageWorkflowMetrics(ctx, challenges.map((challenge) => challenge.imageWorkflowStatus));
    return { rebuilt: true, totalChallenges: challenges.length };
  },
});

export const claimNextChallenge = internalMutation({
  args: { batchId: v.id("imageGenerationBatches") },
  returns: v.union(v.object({ challengeId: v.id("challenges") }), v.null()),
  handler: async (ctx, args) => {
    const batch = await ctx.db.get(args.batchId);
    if (!batch || (batch.status !== "queued" && batch.status !== "running")) return null;
    const challengeId = batch.challengeIds[batch.nextChallengeIndex];
    if (!challengeId) return null;
    const now = Date.now();
    await ctx.db.patch(batch._id, { status: "running", nextChallengeIndex: batch.nextChallengeIndex + 1, updatedAt: now });
    const challenge = await ctx.db.get(challengeId);
    if (challenge) await updateImageWorkflowStatus(ctx, challenge, "generating", now);
    return { challengeId };
  },
});

export const generationInput = internalQuery({
  args: { batchId: v.id("imageGenerationBatches"), challengeId: v.id("challenges") },
  returns: v.object({
    provider: providerValidator,
    model: v.string(),
    candidateCount: v.number(),
    question: v.string(),
    prompt: v.string(),
    negativePrompt: v.string(),
    criticalFacts: v.array(v.string()),
    regionRules: v.array(v.string()),
    promptVersion: v.number(),
  }),
  handler: async (ctx, args) => {
    const [batch, challenge] = await Promise.all([ctx.db.get(args.batchId), ctx.db.get(args.challengeId)]);
    if (!batch || !challenge) throw new Error("GENERATION_INPUT_NOT_FOUND");
    const spec = await ctx.db.query("imageSpecs").withIndex("by_challenge_id", (q) => q.eq("challengeId", challenge._id)).unique();
    if (!spec) throw new Error("IMAGE_SPEC_NOT_FOUND");
    return {
      provider: batch.provider,
      model: batch.model,
      candidateCount: batch.candidateCount,
      question: challenge.question,
      prompt: spec.prompt,
      negativePrompt: spec.negativePrompt,
      criticalFacts: spec.criticalFacts,
      regionRules: spec.regionRules,
      promptVersion: spec.promptVersion,
    };
  },
});

export const recordCandidate = internalMutation({
  args: {
    batchId: v.id("imageGenerationBatches"),
    challengeId: v.id("challenges"),
    storageId: v.id("_storage"),
    provider: providerValidator,
    model: v.string(),
    promptVersion: v.number(),
    candidateIndex: v.number(),
    width: v.number(),
    height: v.number(),
  },
  returns: v.id("imageCandidates"),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("imageCandidates")
      .withIndex("by_batch_id_and_challenge_id_and_candidate_index", (q) => q.eq("batchId", args.batchId).eq("challengeId", args.challengeId).eq("candidateIndex", args.candidateIndex))
      .unique();
    if (existing) return existing._id;
    return await ctx.db.insert("imageCandidates", {
      ...args,
      createdAt: Date.now(),
      qaStatus: "pending",
      approvalStatus: "pending",
    });
  },
});

export const recordQa = internalMutation({
  args: { candidateId: v.id("imageCandidates"), qa: qaPayloadValidator },
  returns: v.null(),
  handler: async (ctx, args) => {
    const candidate = await ctx.db.get(args.candidateId);
    if (!candidate) throw new Error("CANDIDATE_NOT_FOUND");
    await ctx.db.insert("imageQaResults", { candidateId: candidate._id, ...args.qa, createdAt: Date.now() });
    await ctx.db.patch(candidate._id, { qaStatus: args.qa.status });
    return null;
  },
});

export const completeBatchChallenge = internalMutation({
  args: {
    batchId: v.id("imageGenerationBatches"),
    challengeId: v.id("challenges"),
    generatedCandidates: v.number(),
    qaPassed: v.number(),
    qaFailed: v.number(),
    qaWarnings: v.number(),
    error: v.optional(v.string()),
  },
  returns: v.object({ recorded: v.boolean(), batchStatus: batchStatusValidator }),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("imageGenerationBatchResults")
      .withIndex("by_batch_id_and_challenge_id", (q) => q.eq("batchId", args.batchId).eq("challengeId", args.challengeId))
      .unique();
    const batch = await ctx.db.get(args.batchId);
    if (!batch) throw new Error("BATCH_NOT_FOUND");
    if (existing) return { recorded: false, batchStatus: batch.status };
    const now = Date.now();
    const status = args.error ? "error" : "completed";
    await ctx.db.insert("imageGenerationBatchResults", {
      batchId: args.batchId,
      challengeId: args.challengeId,
      status,
      generatedCandidates: args.generatedCandidates,
      qaPassed: args.qaPassed,
      qaFailed: args.qaFailed,
      qaWarnings: args.qaWarnings,
      error: args.error,
      processedAt: now,
    });
    const processedChallenges = batch.processedChallenges + 1;
    const errors = args.error && batch.errors.length < 100
      ? [...batch.errors, { challengeId: args.challengeId, message: args.error, occurredAt: now }]
      : batch.errors;
    const terminal = processedChallenges >= batch.challengeIds.length;
    const batchStatus = nextBatchStatus(processedChallenges, batch.challengeIds.length, errors.length);
    await ctx.db.patch(batch._id, {
      processedChallenges,
      generatedCandidates: batch.generatedCandidates + args.generatedCandidates,
      qaPassed: batch.qaPassed + args.qaPassed,
      qaFailed: batch.qaFailed + args.qaFailed,
      errors,
      status: batchStatus,
      updatedAt: now,
      ...(terminal ? { completedAt: now } : {}),
    });
    const challenge = await ctx.db.get(args.challengeId);
    if (challenge) {
      const nextStatus = workflowStatusForBatchResult({
        hasError: Boolean(args.error),
        generatedCandidates: args.generatedCandidates,
        qaPassed: args.qaPassed,
        qaFailed: args.qaFailed,
      });
      await updateImageWorkflowStatus(ctx, challenge, nextStatus, now);
    }
    return { recorded: true, batchStatus };
  },
});
