import type {
  AchievementDefinition,
  AnalyticsEvent,
  ChallengeResult,
  DailyState,
  LeaderboardEntry,
  LocalProgress,
  PublicChallenge,
  Reaction,
} from "@/lib/domain/types";

export interface ChallengeRepository {
  listPublished(): Promise<PublicChallenge[]>;
  findByIdOrSlug(id: string): Promise<PublicChallenge | null>;
  submitResponse(input: {
    challengeId: string;
    answerId: string;
    idempotencyKey: string;
  }): Promise<ChallengeResult>;
}

export interface ProgressRepository {
  load(): LocalProgress;
  save(progress: LocalProgress): void;
  clear(): void;
}

export interface DailyRepository {
  getState(date: string): Promise<DailyState>;
  complete(date: string): Promise<DailyState>;
}

export interface LeaderboardRepository {
  list(period: "week" | "all"): Promise<LeaderboardEntry[]>;
}

export interface AchievementRepository {
  list(): Promise<AchievementDefinition[]>;
}

export interface AnalyticsRepository {
  track(event: AnalyticsEvent): Promise<void>;
}

export interface ReactionRepository {
  set(challengeId: string, reaction: Reaction): Promise<void>;
}
