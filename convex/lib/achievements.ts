import type { MutationCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import { achievementSatisfied } from "./progression";
import { asProgressResponse, responsesForPlayer } from "./players";

export async function awardEligibleAchievements(
  ctx: MutationCtx,
  userId: Id<"users">,
  dailyStreak: number,
  now = Date.now(),
) {
  const [definitions, earned, responses] = await Promise.all([
    ctx.db.query("achievements").take(100),
    ctx.db
      .query("playerAchievements")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .take(100),
    responsesForPlayer(ctx, userId),
  ]);
  const earnedIds = new Set(earned.map((item) => item.achievementId));
  const eligible = definitions.filter(
    (achievement) =>
      !earnedIds.has(achievement._id) &&
      achievementSatisfied(achievement, responses.map(asProgressResponse), dailyStreak),
  );
  await Promise.all(eligible.map((achievement) => ctx.db.insert("playerAchievements", {
    userId,
    achievementId: achievement._id,
    earnedAt: now,
  })));
  return eligible.map((achievement) => ({
    id: achievement.stableId,
    slug: achievement.slug,
    name: achievement.name,
    description: achievement.description,
    icon: achievement.icon,
    criteria: achievement.criteria,
    value: achievement.value,
  }));
}
