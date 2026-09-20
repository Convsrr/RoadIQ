import { afterEach, describe, expect, it, vi } from "vitest";
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
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("creates challenge-specific visual briefs for every seeded challenge", () => {
    for (const challenge of CHALLENGE_SEEDS) {
      const spec = createImageSpecDraft(challenge);
      expect(spec.scene).not.toBe(challenge.question);
      expect(spec.criticalFacts.length, challenge.id).toBeGreaterThanOrEqual(4);
      expect(spec.prompt).toContain(challenge.question);
      expect(spec.composition).toContain("4:5");
    }
  });

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
      expect.stringContaining("left"),
      expect.stringContaining("American road layouts"),
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

  it("parses fenced JSON returned by a chat-compatible QA provider", () => {
    const qa = parseImageQaJson("```json\n{\"status\":\"pass\",\"score\":91,\"issues\":[],\"confirmedFacts\":[\"lane visible\"],\"missingFacts\":[],\"contradictions\":[],\"summary\":\"Clear\"}\n```", "goi-qa");
    expect(qa).toMatchObject({ status: "pass", score: 91, model: "goi-qa" });
    expect(qa.confirmedFacts).toEqual(["lane visible"]);
  });

  it("generates and evaluates through GOI's OpenAI-compatible endpoints", async () => {
    vi.stubEnv("GOI_API_KEY", "server-only-test-key");
    vi.stubEnv("GOI_BASE_URL", "https://example.test/v1/");
    const png = Buffer.alloc(24);
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(png);
    png.writeUInt32BE(640, 16);
    png.writeUInt32BE(800, 20);
    const qaJson = JSON.stringify({
      status: "pass",
      score: 96,
      issues: [],
      confirmedFacts: ["passing place visible"],
      missingFacts: [],
      contradictions: [],
      summary: "The geometry is clear.",
    });
    const fencedQa = [String.fromCharCode(96).repeat(3) + "json", qaJson, String.fromCharCode(96).repeat(3)].join("\n");
    const calls: Array<{ url: string; body: Record<string, unknown> }> = [];
    vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>;
      calls.push({ url, body });
      if (url.endsWith("/images/generations")) {
        return new Response(JSON.stringify({ data: [{ b64_json: png.toString("base64"), mime_type: "image/png" }] }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ choices: [{ message: { content: fencedQa } }] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }));

    const image = await generateCandidateImage({
      provider: "goi",
      model: "gpt-image-2",
      prompt: "A UK single-track road.",
      negativePrompt: "No readable plates.",
      candidateIndex: 0,
    });
    const qa = await evaluateCandidateImage({
      provider: "goi",
      model: "gemini-3.1-pro",
      question: "Who should reverse?",
      criticalFacts: ["A passing place is visible."],
      regionRules: ["Use left-hand traffic."],
      image,
    });

    expect(image).toMatchObject({ mimeType: "image/png", width: 640, height: 800 });
    expect(qa).toMatchObject({ status: "pass", score: 96, model: "gemini-3.1-pro" });
    expect(calls.map((call) => call.url)).toEqual([
      "https://example.test/v1/images/generations",
      "https://example.test/v1/chat/completions",
    ]);
    expect(calls[0].body).toMatchObject({ model: "gpt-image-2" });
    expect(calls[0].body).not.toHaveProperty("size");
    expect(calls[0].body).not.toHaveProperty("response_format");
    expect(calls[1].body).toMatchObject({ model: "gemini-3.1-pro", response_format: { type: "json_object" } });
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
