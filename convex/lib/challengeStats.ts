import type { MutationCtx } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";

export async function recordChallengeResponse(
  ctx: MutationCtx,
  challengeId: Id<"challenges">,
  answerStableId: string,
  allAnswerStableIds: string[],
  now = Date.now(),
): Promise<Doc<"challengeStats">> {
  const existing = await ctx.db
    .query("challengeStats")
    .withIndex("by_challenge_id", (q) => q.eq("challengeId", challengeId))
    .unique();
  const answerCounts = Object.fromEntries(allAnswerStableIds.map((answerId) => [answerId, 0]));
  if (existing) {
    Object.assign(answerCounts, existing.answerCounts);
  }
  answerCounts[answerStableId] = (answerCounts[answerStableId] ?? 0) + 1;
  const values = {
    totalResponses: (existing?.totalResponses ?? 0) + 1,
    answerCounts,
    updatedAt: now,
  };
  if (existing) {
    await ctx.db.patch(existing._id, values);
    return { ...existing, ...values };
  }
  const statsId = await ctx.db.insert("challengeStats", { challengeId, ...values });
  return (await ctx.db.get(statsId))!;
}
