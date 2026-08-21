import { z } from "zod";
import { CATEGORIES, CHALLENGE_TYPES, DIFFICULTIES } from "@/lib/domain/types";

export const responseRecordSchema = z.object({
  id: z.string().min(1),
  idempotencyKey: z.string().min(1),
  challengeId: z.string().min(1),
  answerId: z.string().min(1),
  challengeType: z.enum(CHALLENGE_TYPES),
  category: z.enum(CATEGORIES),
  difficulty: z.enum(DIFFICULTIES),
  isCorrect: z.boolean().nullable(),
  xpAwarded: z.number().int().nonnegative(),
  answeredAt: z.iso.datetime(),
});

export const submitResponseSchema = z.object({
  challengeId: z.string().min(1).max(80),
  answerId: z.string().min(1).max(80),
  idempotencyKey: z.string().min(8).max(100),
}).strict();

export const mockProgressImportSchema = z.object({
  responses: z.array(z.object({
    challengeId: z.string().min(1).max(80),
    answerId: z.string().min(1).max(80),
    idempotencyKey: z.string().min(8).max(100),
    answeredAt: z.iso.datetime(),
  }).strict()).max(5000),
  dailyDates: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).max(1000),
}).strict();

export const reactionSchema = z.object({
  challengeId: z.string().min(1).max(80),
  reaction: z.enum(["positive", "negative"]),
});

export const analyticsEventSchema = z.object({
  id: z.string().min(8).max(100),
  name: z.enum([
    "app_opened",
    "onboarding_started",
    "onboarding_completed",
    "challenge_viewed",
    "challenge_answered",
    "challenge_skipped",
    "result_viewed",
    "next_challenge",
    "challenge_shared",
    "challenge_reacted",
    "daily_started",
    "daily_challenge_answered",
    "daily_completed",
    "streak_updated",
    "leaderboard_viewed",
    "profile_viewed",
    "signup_prompt_viewed",
    "signup_started",
    "signup_completed",
    "pro_viewed",
  ]),
  actorId: z.string().min(1).max(100),
  challengeId: z.string().max(80).optional(),
  occurredAt: z.iso.datetime(),
  context: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).optional(),
});
