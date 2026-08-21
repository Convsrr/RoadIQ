import { describe, expect, it } from "vitest";
import { createLocalProgress, parseStoredProgress } from "@/lib/repositories/local-progress";
import { importAnonymousProgress } from "@/lib/auth/progress-import";

describe("versioned local persistence", () => {
  it("creates a version-one anonymous identity", () => {
    const progress = createLocalProgress(new Date("2026-08-21T12:00:00Z"));
    expect(progress.version).toBe(1);
    expect(progress.actorId.length).toBeGreaterThan(8);
    expect(progress.responses).toEqual([]);
  });

  it("round-trips valid progress and rejects corrupt data", () => {
    const progress = createLocalProgress(new Date("2026-08-21T12:00:00Z"));
    expect(parseStoredProgress(JSON.stringify(progress))).toEqual(progress);
    expect(parseStoredProgress("{broken")).toBeNull();
    expect(parseStoredProgress(JSON.stringify({ version: 2 }))).toBeNull();
  });

  it("replays anonymous progress with stable idempotency keys", async () => {
    const progress = createLocalProgress(new Date("2026-08-21T12:00:00Z"));
    progress.responses.push({
      id: "response-import",
      idempotencyKey: "import-key-1234",
      challengeId: "rq-001",
      answerId: "rq-001-a",
      challengeType: "objective",
      category: "Driver IQ",
      difficulty: "Easy",
      isCorrect: true,
      xpAwarded: 5,
      answeredAt: "2026-08-21T12:01:00.000Z",
    });
    progress.dailyCompletions.push({
      date: "2026-08-21",
      completedAt: "2026-08-21T12:10:00.000Z",
      xpAwarded: 50,
    });
    const responseKeys = new Set<string>();
    const dailyDates = new Set<string>();
    const target = {
      submitResponse: async (input: { idempotencyKey: string }) => {
        responseKeys.add(input.idempotencyKey);
      },
      completeDaily: async (date: string) => {
        dailyDates.add(date);
      },
    };

    await importAnonymousProgress(progress, target);
    await importAnonymousProgress(progress, target);

    expect([...responseKeys]).toEqual(["import-key-1234"]);
    expect([...dailyDates]).toEqual(["2026-08-21"]);
  });
});
