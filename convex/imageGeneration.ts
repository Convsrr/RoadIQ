"use node";

import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalAction } from "./_generated/server";
import { evaluateCandidateImage, generateCandidateImage } from "./lib/imageProvider";

function safeBatchError(error: unknown): string {
  if (error instanceof Error && /^(?:GEMINI|GOI)_[A-Z0-9_]+$/.test(error.message)) return error.message;
  return "IMAGE_GENERATION_FAILED";
}

function qaModelFor(provider: "mock" | "gemini" | "goi", generationModel: string): string {
  return process.env.ROADIQ_IMAGE_QA_MODEL || (provider === "goi" ? "gemini-3.1-pro" : generationModel);
}

export const processNext = internalAction({
  args: { batchId: v.id("imageGenerationBatches") },
  returns: v.object({ processed: v.boolean() }),
  handler: async (ctx, args) => {
    const task = await ctx.runMutation(internal.imageFactory.claimNextChallenge, { batchId: args.batchId });
    if (!task) return { processed: false };

    try {
      const input = await ctx.runQuery(internal.imageFactory.generationInput, {
        batchId: args.batchId,
        challengeId: task.challengeId,
      });
      let qaPassed = 0;
      let qaFailed = 0;
      let qaWarnings = 0;
      for (let candidateIndex = 0; candidateIndex < input.candidateCount; candidateIndex += 1) {
        const image = await generateCandidateImage({
          provider: input.provider,
          model: input.model,
          prompt: input.prompt,
          negativePrompt: input.negativePrompt,
          candidateIndex,
        });
        const storageBytes = image.bytes.buffer.slice(
          image.bytes.byteOffset,
          image.bytes.byteOffset + image.bytes.byteLength,
        ) as ArrayBuffer;
        const storageId = await ctx.storage.store(new Blob([storageBytes], { type: image.mimeType }));
        const candidateId = await ctx.runMutation(internal.imageFactory.recordCandidate, {
          batchId: args.batchId,
          challengeId: task.challengeId,
          storageId,
          provider: input.provider,
          model: input.model,
          promptVersion: input.promptVersion,
          candidateIndex,
          width: image.width,
          height: image.height,
        });
        const qa = await evaluateCandidateImage({
          provider: input.provider,
          model: qaModelFor(input.provider, input.model),
          question: input.question,
          criticalFacts: input.criticalFacts,
          regionRules: input.regionRules,
          image,
        });
        await ctx.runMutation(internal.imageFactory.recordQa, { candidateId, qa });
        if (qa.status === "pass") qaPassed += 1;
        else if (qa.status === "fail") qaFailed += 1;
        else qaWarnings += 1;
      }
      await ctx.runMutation(internal.imageFactory.completeBatchChallenge, {
        batchId: args.batchId,
        challengeId: task.challengeId,
        generatedCandidates: input.candidateCount,
        qaPassed,
        qaFailed,
        qaWarnings,
      });
    } catch (error) {
      await ctx.runMutation(internal.imageFactory.completeBatchChallenge, {
        batchId: args.batchId,
        challengeId: task.challengeId,
        generatedCandidates: 0,
        qaPassed: 0,
        qaFailed: 0,
        qaWarnings: 0,
        error: safeBatchError(error),
      });
    } finally {
      await ctx.scheduler.runAfter(0, internal.imageGeneration.processNext, { batchId: args.batchId });
    }
    return { processed: true };
  },
});
