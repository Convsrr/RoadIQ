import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { ensureAnonymousPlayer } from "./lib/players";

export const setReaction = mutation({
  args: {
    sessionId: v.string(),
    challengeId: v.string(),
    reaction: v.union(v.literal("positive"), v.literal("negative")),
  },
  returns: v.object({ reaction: v.object({ challengeId: v.string(), reaction: v.union(v.literal("positive"), v.literal("negative")) }) }),
  handler: async (ctx, args) => {
    const user = await ensureAnonymousPlayer(ctx, args.sessionId);
    const challenge = await ctx.db
      .query("challenges")
      .withIndex("by_stable_id", (q) => q.eq("stableId", args.challengeId))
      .unique();
    if (!challenge || challenge.status !== "published") throw new Error("CHALLENGE_NOT_FOUND");
    const existing = await ctx.db
      .query("reactions")
      .withIndex("by_user_id_and_challenge_id", (q) => q.eq("userId", user._id).eq("challengeId", challenge._id))
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, { reaction: args.reaction, updatedAt: Date.now() });
    } else {
      await ctx.db.insert("reactions", {
        userId: user._id,
        challengeId: challenge._id,
        reaction: args.reaction,
        updatedAt: Date.now(),
      });
    }
    return { reaction: { challengeId: challenge.stableId, reaction: args.reaction } };
  },
});
