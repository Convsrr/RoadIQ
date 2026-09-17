import { v } from "convex/values";
import { query } from "./_generated/server";
import { weekStartKey } from "./lib/progression";

const entryValidator = v.object({
  id: v.string(),
  rank: v.number(),
  username: v.string(),
  initials: v.string(),
  xp: v.number(),
  roadIqScore: v.number(),
  isCurrentUser: v.optional(v.boolean()),
});

export const list = query({
  args: {
    period: v.union(v.literal("week"), v.literal("all")),
    sessionId: v.optional(v.string()),
  },
  returns: v.object({ entries: v.array(entryValidator), period: v.union(v.literal("week"), v.literal("all")) }),
  handler: async (ctx, args) => {
    const stats = args.period === "week"
      ? await ctx.db
          .query("playerStats")
          .withIndex("by_weekly_period_and_xp", (q) => q.eq("weeklyPeriod", weekStartKey()))
          .order("desc")
          .take(100)
      : await ctx.db.query("playerStats").withIndex("by_xp").order("desc").take(100);
    const entries = await Promise.all(stats.map(async (stat, index) => {
      const user = await ctx.db.get(stat.userId);
      const username = user?.username ?? "Driver";
      return {
        id: user?.anonymousId ?? stat.userId,
        rank: index + 1,
        username,
        initials: username.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase(),
        xp: args.period === "week" ? stat.weeklyXp : stat.xp,
        roadIqScore: stat.roadIqScore,
        ...(args.sessionId === user?.anonymousId ? { isCurrentUser: true } : {}),
      };
    }));
    return { entries, period: args.period };
  },
});
