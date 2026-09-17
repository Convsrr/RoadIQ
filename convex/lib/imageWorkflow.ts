import type { MutationCtx } from "../_generated/server";
import type { Doc } from "../_generated/dataModel";

export const IMAGE_FACTORY_METRICS_KEY = "global";

export type ImageWorkflowStatus =
  | "missing"
  | "legacy"
  | "generating"
  | "pending_qa"
  | "qa_pass"
  | "qa_warning"
  | "qa_fail"
  | "approved"
  | "published";

export type ImageQaStatus = "pending" | "pass" | "warning" | "fail";
export type ImageApprovalStatus = "pending" | "approved" | "rejected";

export function nextBatchStatus(
  processedChallenges: number,
  challengeCount: number,
  errorCount: number,
): "running" | "completed" | "completed_with_errors" {
  if (processedChallenges < challengeCount) return "running";
  return errorCount > 0 ? "completed_with_errors" : "completed";
}

export function workflowStatusForBatchResult(input: {
  hasError: boolean;
  generatedCandidates: number;
  qaPassed: number;
  qaFailed: number;
}): ImageWorkflowStatus {
  if (input.hasError || input.qaFailed >= input.generatedCandidates) return "qa_fail";
  if (input.qaPassed === input.generatedCandidates) return "qa_pass";
  return "qa_warning";
}

export function canApproveCandidate(qaStatus: ImageQaStatus): boolean {
  return qaStatus !== "pending";
}

export function canPublishCandidate(approvalStatus: ImageApprovalStatus): boolean {
  return approvalStatus === "approved";
}

export function nextAssetVersion(assets: ReadonlyArray<{ version: number }>): number {
  return Math.max(0, ...assets.map((asset) => asset.version)) + 1;
}

export function isRollbackTargetForChallenge(challengeId: string, targetChallengeId: string): boolean {
  return challengeId === targetChallengeId;
}

type MetricField = Exclude<keyof Doc<"imageFactoryMetrics">, "_id" | "_creationTime" | "key" | "totalChallenges" | "updatedAt">;

const FIELD_BY_STATUS: Record<ImageWorkflowStatus, MetricField> = {
  missing: "missing",
  legacy: "legacy",
  generating: "generating",
  pending_qa: "pendingQa",
  qa_pass: "qaPass",
  qa_warning: "qaWarning",
  qa_fail: "qaFail",
  approved: "approved",
  published: "published",
};

function emptyMetrics(now: number) {
  return {
    key: IMAGE_FACTORY_METRICS_KEY,
    totalChallenges: 0,
    missing: 0,
    legacy: 0,
    generating: 0,
    pendingQa: 0,
    qaPass: 0,
    qaWarning: 0,
    qaFail: 0,
    approved: 0,
    published: 0,
    updatedAt: now,
  };
}

async function metricsForUpdate(ctx: MutationCtx, now: number) {
  const existing = await ctx.db
    .query("imageFactoryMetrics")
    .withIndex("by_key", (q) => q.eq("key", IMAGE_FACTORY_METRICS_KEY))
    .unique();
  if (existing) return existing;
  const id = await ctx.db.insert("imageFactoryMetrics", emptyMetrics(now));
  return (await ctx.db.get(id))!;
}

export async function recordSeededWorkflowStatuses(
  ctx: MutationCtx,
  statuses: ImageWorkflowStatus[],
  now = Date.now(),
): Promise<void> {
  if (statuses.length === 0) return;
  const metrics = await metricsForUpdate(ctx, now);
  const values: Record<string, number> = {
    totalChallenges: metrics.totalChallenges + statuses.length,
  };
  for (const status of statuses) {
    const field = FIELD_BY_STATUS[status];
    values[field] = (values[field] ?? metrics[field]) + 1;
  }
  await ctx.db.patch(metrics._id, { ...values, updatedAt: now });
}

export async function updateImageWorkflowStatus(
  ctx: MutationCtx,
  challenge: Doc<"challenges">,
  nextStatus: ImageWorkflowStatus,
  now = Date.now(),
): Promise<void> {
  if (challenge.imageWorkflowStatus === nextStatus) return;
  const metrics = await metricsForUpdate(ctx, now);
  const previousField = FIELD_BY_STATUS[challenge.imageWorkflowStatus];
  const nextField = FIELD_BY_STATUS[nextStatus];
  await Promise.all([
    ctx.db.patch(challenge._id, { imageWorkflowStatus: nextStatus, updatedAt: now }),
    ctx.db.patch(metrics._id, {
      [previousField]: Math.max(0, metrics[previousField] - 1),
      [nextField]: metrics[nextField] + 1,
      updatedAt: now,
    }),
  ]);
}

export async function replaceImageWorkflowMetrics(
  ctx: MutationCtx,
  statuses: ImageWorkflowStatus[],
  now = Date.now(),
): Promise<void> {
  const metrics = await metricsForUpdate(ctx, now);
  const next = emptyMetrics(now);
  next.totalChallenges = statuses.length;
  for (const status of statuses) next[FIELD_BY_STATUS[status]] += 1;
  await ctx.db.patch(metrics._id, next);
}
