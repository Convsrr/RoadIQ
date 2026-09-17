export const CATEGORIES = [
  "Driver IQ",
  "Parking IQ",
  "Road IQ",
  "Who's Wrong?",
  "Car IQ",
  "Spot It",
] as const;

export const DIFFICULTIES = ["Easy", "Medium", "Hard", "Expert"] as const;
export const CHALLENGE_TYPES = ["objective", "community"] as const;

export type Category = (typeof CATEGORIES)[number];
export type Difficulty = (typeof DIFFICULTIES)[number];
export type ChallengeType = (typeof CHALLENGE_TYPES)[number];
export type Region = string;
export type ThemePreference = "system" | "dark" | "light";
export type Reaction = "positive" | "negative";

export interface AnswerChoice {
  id: string;
  text: string;
}

export interface ImageAttribution {
  provider: string;
  creator: string;
  sourceUrl?: string;
  licenseNote: string;
}

export interface PublicChallenge {
  id: string;
  slug: string;
  question: string;
  imageUrl: string;
  imageAlt: string;
  imagePosition: string;
  imageAttribution: ImageAttribution;
  category: Category;
  difficulty: Difficulty;
  challengeType: ChallengeType;
  explanation: string;
  region: Region;
  answers: AnswerChoice[];
}

export interface ChallengeSeed extends PublicChallenge {
  correctAnswerId: string | null;
  fixtureVotes: Record<string, number>;
}

export interface AnswerPercentage {
  answerId: string;
  count: number;
  percentage: number;
}

export interface ResponseRecord {
  id: string;
  idempotencyKey: string;
  challengeId: string;
  answerId: string;
  challengeType: ChallengeType;
  category: Category;
  difficulty: Difficulty;
  isCorrect: boolean | null;
  xpAwarded: number;
  answeredAt: string;
}

export interface ChallengeResult {
  response: ResponseRecord;
  selectedAnswerId: string;
  correctAnswerId: string | null;
  isCorrect: boolean | null;
  percentages: AnswerPercentage[];
  totalResponses: number;
  majorityAnswerId: string;
  majorityAgreement: number;
  xpAwarded: number;
  totalXp: number;
  roadIqScore: number;
  previousRoadIqScore: number;
  rank: RankSnapshot;
  newlyEarnedAchievements: AchievementDefinition[];
}

export interface DailyCompletion {
  date: string;
  completedAt: string;
  xpAwarded: number;
}

export interface LocalProgress {
  version: 1;
  actorId: string;
  username: string;
  createdAt: string;
  started: boolean;
  responses: ResponseRecord[];
  viewedChallengeIds: string[];
  skippedChallengeIds: string[];
  reactions: Record<string, Reaction>;
  dailyCompletions: DailyCompletion[];
  currentStreak: number;
  longestStreak: number;
  theme: ThemePreference;
  lastSignupPromptAt: string | null;
  signupPromptAnswerCount: number;
}

export interface CategoryPerformance {
  category: Category;
  attempted: number;
  correct: number;
  accuracy: number | null;
}

export interface RankSnapshot {
  name: string;
  threshold: number;
  nextName: string | null;
  nextThreshold: number | null;
  progress: number;
  calibrated: boolean;
}

export interface PlayerSnapshot {
  actorId: string;
  username: string;
  roadIqScore: number;
  rank: RankSnapshot;
  xp: number;
  challengesAnswered: number;
  objectiveAccuracy: number | null;
  currentStreak: number;
  longestStreak: number;
  categoryPerformance: CategoryPerformance[];
  achievements: EarnedAchievement[];
}

export interface DailyState {
  date: string;
  challengeIds: string[];
  completedChallengeIds: string[];
  completed: boolean;
  bonusAwarded: boolean;
}

export interface LeaderboardEntry {
  id: string;
  rank: number;
  username: string;
  initials: string;
  xp: number;
  roadIqScore: number;
  isCurrentUser?: boolean;
}

export type AchievementCriteria =
  | "parking_correct"
  | "spot_correct"
  | "objective_correct_streak"
  | "challenges_answered"
  | "daily_streak";

export interface AchievementDefinition {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon: string;
  criteria: AchievementCriteria;
  value: number;
}

export interface EarnedAchievement {
  achievementId: string;
  earnedAt: string;
}

export type AnalyticsEventName =
  | "app_opened"
  | "onboarding_started"
  | "onboarding_completed"
  | "challenge_viewed"
  | "challenge_answered"
  | "challenge_skipped"
  | "result_viewed"
  | "next_challenge"
  | "challenge_shared"
  | "challenge_reacted"
  | "daily_started"
  | "daily_challenge_answered"
  | "daily_completed"
  | "streak_updated"
  | "leaderboard_viewed"
  | "profile_viewed"
  | "signup_prompt_viewed"
  | "signup_started"
  | "signup_completed"
  | "pro_viewed";

export interface AnalyticsEvent {
  id: string;
  name: AnalyticsEventName;
  actorId: string;
  challengeId?: string;
  occurredAt: string;
  context?: Record<string, string | number | boolean | null>;
}
