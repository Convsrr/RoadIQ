"use client";

import { z } from "zod";
import type { LocalProgress, ThemePreference } from "@/lib/domain/types";
import { responseRecordSchema } from "@/lib/validation/api";

export const LOCAL_PROGRESS_KEY = "roadiq:progress:v1";
export const LOCAL_PROGRESS_VERSION = 1;

type StoredObject = Record<string, unknown>;
type LocalProgressMigration = (value: StoredObject) => StoredObject;

// Add a migration under the version it upgrades from, then increment
// LOCAL_PROGRESS_VERSION and the validated schema together.
const localProgressMigrations: Partial<Record<number, LocalProgressMigration>> = {};

const localProgressSchema = z.object({
  version: z.literal(1),
  actorId: z.string().min(1),
  username: z.string().min(1),
  createdAt: z.iso.datetime(),
  started: z.boolean(),
  responses: z.array(responseRecordSchema),
  viewedChallengeIds: z.array(z.string()),
  skippedChallengeIds: z.array(z.string()),
  reactions: z.record(z.string(), z.enum(["positive", "negative"])),
  dailyCompletions: z.array(
    z.object({
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      completedAt: z.iso.datetime(),
      xpAwarded: z.number().int().nonnegative(),
    }),
  ),
  currentStreak: z.number().int().nonnegative(),
  longestStreak: z.number().int().nonnegative(),
  theme: z.enum(["system", "dark", "light"]),
  lastSignupPromptAt: z.iso.datetime().nullable(),
  signupPromptAnswerCount: z.number().int().nonnegative(),
});

function generatedActorId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `local-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function createLocalProgress(now = new Date()): LocalProgress {
  const actorId = generatedActorId();
  return {
    version: 1,
    actorId,
    username: `Driver ${actorId.slice(0, 4).toUpperCase()}`,
    createdAt: now.toISOString(),
    started: false,
    responses: [],
    viewedChallengeIds: [],
    skippedChallengeIds: [],
    reactions: {},
    dailyCompletions: [],
    currentStreak: 0,
    longestStreak: 0,
    theme: "system",
    lastSignupPromptAt: null,
    signupPromptAnswerCount: 0,
  };
}

export function parseStoredProgress(raw: string | null): LocalProgress | null {
  if (!raw) return null;
  try {
    let value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    let version = Number((value as StoredObject).version);
    while (Number.isInteger(version) && version < LOCAL_PROGRESS_VERSION) {
      const migrate = localProgressMigrations[version];
      if (!migrate) return null;
      value = migrate(value as StoredObject);
      version = Number((value as StoredObject).version);
    }
    const parsed = localProgressSchema.safeParse(value);
    return parsed.success ? (parsed.data as LocalProgress) : null;
  } catch {
    return null;
  }
}

export class LocalProgressRepository {
  load(): LocalProgress {
    const existing = parseStoredProgress(window.localStorage.getItem(LOCAL_PROGRESS_KEY));
    if (existing) return existing;
    const progress = createLocalProgress();
    this.save(progress);
    return progress;
  }

  save(progress: LocalProgress): void {
    window.localStorage.setItem(LOCAL_PROGRESS_KEY, JSON.stringify(progress));
  }

  clear(): void {
    window.localStorage.removeItem(LOCAL_PROGRESS_KEY);
  }

  setTheme(progress: LocalProgress, theme: ThemePreference): LocalProgress {
    const next = { ...progress, theme };
    this.save(next);
    return next;
  }
}
