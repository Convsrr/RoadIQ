import type { LocalProgress, PlayerSnapshot } from "@/lib/domain/types";
import { earnedAchievementsFromResponses } from "@/lib/services/achievements";
import {
  calculateRoadIq,
  categoryPerformance,
  getRank,
  objectiveAccuracy,
  totalXp,
} from "@/lib/services/scoring";

export function playerSnapshot(progress: LocalProgress): PlayerSnapshot {
  const score = calculateRoadIq(progress.responses);
  const objectiveAttempts = progress.responses.filter(
    (response) => response.challengeType === "objective",
  ).length;
  return {
    actorId: progress.actorId,
    username: progress.username,
    roadIqScore: score,
    rank: getRank(score, objectiveAttempts),
    xp: totalXp(progress),
    challengesAnswered: progress.responses.length,
    objectiveAccuracy: objectiveAccuracy(progress.responses),
    currentStreak: progress.currentStreak,
    longestStreak: progress.longestStreak,
    categoryPerformance: categoryPerformance(progress.responses),
    achievements: earnedAchievementsFromResponses(
      progress.responses,
      progress.currentStreak,
    ),
  };
}

export function shouldShowSignupPrompt(progress: LocalProgress, now = new Date()): boolean {
  const answers = progress.responses.length;
  if (answers < 10) return false;
  if (progress.signupPromptAnswerCount === 0) return true;
  if (answers - progress.signupPromptAnswerCount < 15) return false;
  if (!progress.lastSignupPromptAt) return true;
  return now.getTime() - Date.parse(progress.lastSignupPromptAt) >= 7 * 86_400_000;
}
