import type { LocalProgress } from "@/lib/domain/types";

export interface AccountProgressImportTarget {
  submitResponse(input: {
    challengeId: string;
    answerId: string;
    idempotencyKey: string;
  }): Promise<void>;
  completeDaily(date: string): Promise<void>;
}

export interface ProgressImportReceipt {
  responseAttempts: number;
  dailyAttempts: number;
}

export async function importAnonymousProgress(
  progress: LocalProgress,
  target: AccountProgressImportTarget,
): Promise<ProgressImportReceipt> {
  const responses = [...new Map(
    progress.responses.map((response) => [response.challengeId, response]),
  ).values()];
  const dates = [...new Set(progress.dailyCompletions.map((completion) => completion.date))];

  for (const response of responses) {
    await target.submitResponse({
      challengeId: response.challengeId,
      answerId: response.answerId,
      idempotencyKey: response.idempotencyKey,
    });
  }
  for (const date of dates) await target.completeDaily(date);

  return { responseAttempts: responses.length, dailyAttempts: dates.length };
}
