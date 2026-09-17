import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { ensureAnonymousPlayer } from "./lib/players";

const analyticsNameValidator = v.union(
  v.literal("app_opened"),
  v.literal("onboarding_started"),
  v.literal("onboarding_completed"),
  v.literal("challenge_viewed"),
  v.literal("challenge_answered"),
  v.literal("challenge_skipped"),
  v.literal("result_viewed"),
  v.literal("next_challenge"),
  v.literal("challenge_shared"),
  v.literal("challenge_reacted"),
  v.literal("daily_started"),
  v.literal("daily_challenge_answered"),
  v.literal("daily_completed"),
  v.literal("streak_updated"),
  v.literal("leaderboard_viewed"),
  v.literal("profile_viewed"),
  v.literal("signup_prompt_viewed"),
  v.literal("signup_started"),
  v.literal("signup_completed"),
  v.literal("pro_viewed"),
);

const contextValidator = v.record(v.string(), v.union(v.string(), v.number(), v.boolean(), v.null()));

export const track = mutation({
  args: {
    sessionId: v.string(),
    id: v.string(),
    name: analyticsNameValidator,
    challengeId: v.optional(v.string()),
    occurredAt: v.number(),
    context: v.optional(contextValidator),
  },
  returns: v.object({ accepted: v.boolean() }),
  handler: async (ctx, args) => {
    if (args.id.length < 8 || args.id.length > 100 || !Number.isSafeInteger(args.occurredAt)) {
      throw new Error("INVALID_ANALYTICS_EVENT");
    }
    if (args.context && (Object.keys(args.context).length > 20 || Object.entries(args.context).some(([key, value]) => key.length > 80 || String(value).length > 500))) {
      throw new Error("ANALYTICS_CONTEXT_TOO_LARGE");
    }
    const user = await ensureAnonymousPlayer(ctx, args.sessionId);
    const challenge = args.challengeId
      ? await ctx.db.query("challenges").withIndex("by_stable_id", (q) => q.eq("stableId", args.challengeId!)).unique()
      : null;
    if (args.challengeId && !challenge) throw new Error("CHALLENGE_NOT_FOUND");
    await ctx.db.insert("analyticsEvents", {
      userId: user._id,
      challengeId: challenge?._id,
      name: args.name,
      occurredAt: Math.min(args.occurredAt, Date.now() + 60_000),
      context: args.context,
    });
    return { accepted: true };
  },
});
