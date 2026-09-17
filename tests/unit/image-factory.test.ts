import { describe, expect, it } from "vitest";
import { CHALLENGE_SEEDS } from "@/data/challenges.server";
import { createImageSpecDraft } from "@/lib/image-factory/spec";
import { evaluateCandidateImage, generateCandidateImage } from "../../convex/lib/imageProvider";
import { parseImageQaJson, parseImageQaPayload } from "../../convex/lib/imageQa";
import {
  canApproveCandidate,
  canPublishCandidate,
  isRollbackTargetForChallenge,
  nextAssetVersion,
  nextBatchStatus,
  workflowStatusForBatchResult,
} from "../../convex/lib/imageWorkflow";

describe("RoadIQ Image Factory", () => {
  it("creates a passing-place specification with the decision-critical facts", () => {
    const challenge = CHALLENGE_SEEDS.find((item) => item.id === "rq-012");
    expect(challenge).toBeDefined();
    const spec = createImageSpecDraft(challenge!);
    expect(spec.status).toBe("needs_review");
    expect(spec.criticalFacts).toEqual(expect.arrayContaining([
      expect.stringContaining("Two vehicles face each other"),
      expect.stringContaining("passing place"),
      expect.stringContaining("clearly closer"),
    ]));
    expect(spec.regionRules).toEqual(expect.arrayContaining([
      expect.stringContaining("Left-hand traffic"),
      expect.stringContaining("No American road layouts"),
    ]));
    expect(spec.composition).toContain("4:5");
  });

  it("normalises a structured QA response without trusting out-of-range scores", () => {
    const qa = parseImageQaPayload({
      status: "pass",
      score: 143.6,
      issues: [""],
      confirmedFacts: ["Passing place visible"],
      missingFacts: [],
      contradictions: [],
      summary: "The core road geometry is visible.",
    }, "qa-model");
    expect(qa).toMatchObject({ status: "pass", score: 100, model: "qa-model" });
    expect(qa.confirmedFacts).toEqual(["Passing place visible"]);
  });

  it("turns malformed QA output into a manual-review warning", () => {
    const qa = parseImageQaJson("not json", "qa-model");
    expect(qa.status).toBe("warning");
    expect(qa.score).toBe(0);
    expect(qa.issues[0]).toContain("unreadable");
  });

  it("keeps mock generation in the human-review workflow", async () => {
    const image = await generateCandidateImage({
      provider: "mock",
      model: "mock-road-iq-v1",
      prompt: "A clear UK single-track road with a passing place.",
      negativePrompt: "No readable plates.",
      candidateIndex: 0,
    });
    const qa = await evaluateCandidateImage({
      provider: "mock",
      model: "mock-qa-v1",
      question: "Who should reverse?",
      criticalFacts: ["A passing place is visible."],
      regionRules: ["Use left-hand traffic."],
      image,
    });

    expect(image).toMatchObject({ mimeType: "image/svg+xml", width: 1200, height: 1500 });
    expect(qa).toMatchObject({ status: "warning", score: 0, model: "mock-qa-v1" });
    expect(qa.summary).toContain("Mock image");
  });

  it("tracks batch completion and the resulting QA workflow state", () => {
    expect(nextBatchStatus(2, 3, 0)).toBe("running");
    expect(nextBatchStatus(3, 3, 0)).toBe("completed");
    expect(nextBatchStatus(3, 3, 1)).toBe("completed_with_errors");
    expect(workflowStatusForBatchResult({ hasError: false, generatedCandidates: 3, qaPassed: 3, qaFailed: 0 })).toBe("qa_pass");
    expect(workflowStatusForBatchResult({ hasError: false, generatedCandidates: 3, qaPassed: 1, qaFailed: 1 })).toBe("qa_warning");
    expect(workflowStatusForBatchResult({ hasError: true, generatedCandidates: 0, qaPassed: 0, qaFailed: 0 })).toBe("qa_fail");
  });

  it("requires review before publishing and preserves asset rollback boundaries", () => {
    expect(canApproveCandidate("pending")).toBe(false);
    expect(canApproveCandidate("warning")).toBe(true);
    expect(canPublishCandidate("pending")).toBe(false);
    expect(canPublishCandidate("approved")).toBe(true);
    expect(nextAssetVersion([{ version: 1 }, { version: 3 }])).toBe(4);
    expect(isRollbackTargetForChallenge("rq-012", "rq-012")).toBe(true);
    expect(isRollbackTargetForChallenge("rq-012", "rq-013")).toBe(false);
  });
});
