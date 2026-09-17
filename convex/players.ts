import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { awardEligibleAchievements } from "./lib/achievements";
import { assertDateKey, completedDailyChallengeIds, ensureDailyChallenge } from "./lib/daily";
import {
  ensureAnonymousPlayer,
  getUserBySession,
  playerSnapshot,
  refreshPlayerStats,
} from "./lib/players";
import { submitServerResponse } from "./progress";
import { playerSnapshotValidator } from "./lib/validators";

const importedResponseValidator = v.object({
  challengeId: v.string(),
  answerId: v.string(),
  idempotencyKey: v.string(),
  answeredAt: v.number(),
});

export const ensureAnonymous = mutation({
  args: { sessionId: v.string() },
  returns: v.object({ profile: playerSnapshotValidator }),
  handler: async (ctx, args) => {
    const user = await ensureAnonymousPlayer(ctx, args.sessionId);
    return { profile: await playerSnapshot(ctx, user) };
  },
});

export const getSnapshot = query({
  args: { sessionId: v.string() },
  returns: v.union(v.object({ profile: playerSnapshotValidator }), v.null()),
  handler: async (ctx, args) => {
    const user = await getUserBySession(ctx, args.sessionId);
    return user ? { profile: await playerSnapshot(ctx, user) } : null;
  },
});

export const importProgress = mutation({
  args: {
    sessionId: v.string(),
    responses: v.array(importedResponseValidator),
    dailyDates: v.array(v.string()),
  },
  returns: v.object({
    profile: playerSnapshotValidator,
    importedResponses: v.number(),
    importedDailyCompletions: v.number(),
  }),
  handler: async (ctx, args) => {
    if (args.responses.length > 5_000 || args.dailyDates.length > 1_000) {
      throw new Error("IMPORT_LIMIT_EXCEEDED");
    }
    const user = await ensureAnonymousPlayer(ctx, args.sessionId);
    const sortedResponses = [...args.responses].sort((a, b) => a.answeredAt - b.answeredAt);
    let importedResponses = 0;

    for (const response of sortedResponses) {
      if (!Number.isSafeInteger(response.answeredAt) || response.answeredAt <= 0 || response.answeredAt > Date.now() + 60_000) {
        throw new Error("INVALID_RESPONSE_TIMESTAMP");
      }
      const before = await ctx.db
        .query("challengeResponses")
        .withIndex("by_user_id_and_idempotency_key", (q) => q.eq("userId", user._id).eq("idempotencyKey", response.idempotencyKey))
        .unique();
      await submitServerResponse(ctx, user, response);
      if (!before) importedResponses += 1;
    }

    let importedDailyCompletions = 0;
    for (const date of [...new Set(args.dailyDates)].sort()) {
      assertDateKey(date);
      if (Date.parse(`${date}T23:59:59Z`) > Date.now() + 60_000) {
        throw new Error("INVALID_DAILY_DATE");
      }
      const daily = await ensureDailyChallenge(ctx, date, Date.parse(`${date}T12:00:00Z`));
      const existing = await ctx.db
        .query("dailyCompletions")
        .withIndex("by_user_id_and_date", (q) => q.eq("userId", user._id).eq("date", date))
        .unique();
      if (existing) continue;
      const completedIds = await completedDailyChallengeIds(ctx, user._id, daily);
      if (completedIds.length !== daily.challengeIds.length) continue;
      await ctx.db.insert("dailyCompletions", {
        userId: user._id,
        dailyChallengeId: daily._id,
        date,
        xpAwarded: 50,
        completedAt: Date.parse(`${date}T12:00:00Z`),
      });
      importedDailyCompletions += 1;
    }

    const stats = await refreshPlayerStats(ctx, user._id);
    await awardEligibleAchievements(ctx, user._id, stats.currentStreak);
    return {
      profile: await playerSnapshot(ctx, user),
      importedResponses,
      importedDailyCompletions,
    };
  },
});

/**
 * Keeps the anonymous player row stable while attaching a future Convex Auth
 * identity. This is intentionally dormant until the app configures an auth
 * provider; gameplay never requires the identity to exist.
 */
export const linkAuthenticatedIdentity = mutation({
  args: { sessionId: v.string() },
  returns: v.object({ profile: playerSnapshotValidator }),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("AUTHENTICATION_REQUIRED");
    const user = await ensureAnonymousPlayer(ctx, args.sessionId);
    const alreadyLinked = await ctx.db
      .query("users")
      .withIndex("by_token_identifier", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (alreadyLinked && alreadyLinked._id !== user._id) {
      throw new Error("IDENTITY_ALREADY_LINKED");
    }
    await ctx.db.patch(user._id, {
      tokenIdentifier: identity.tokenIdentifier,
      isAnonymous: false,
      updatedAt: Date.now(),
    });
    return { profile: await playerSnapshot(ctx, { ...user, tokenIdentifier: identity.tokenIdentifier, isAnonymous: false }) };
  },
});
