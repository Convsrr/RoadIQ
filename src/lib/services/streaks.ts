import type { DailyCompletion } from "@/lib/domain/types";

export function localDateKey(date = new Date(), timeZone?: string): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(date);
}

function utcDay(dateKey: string): number {
  return Date.parse(`${dateKey}T00:00:00Z`) / 86_400_000;
}

export function calculateStreaks(completions: DailyCompletion[]): {
  current: number;
  longest: number;
} {
  const uniqueDates = [...new Set(completions.map((completion) => completion.date))].sort();
  if (uniqueDates.length === 0) return { current: 0, longest: 0 };

  let longest = 1;
  let run = 1;
  for (let index = 1; index < uniqueDates.length; index += 1) {
    if (utcDay(uniqueDates[index]) - utcDay(uniqueDates[index - 1]) === 1) run += 1;
    else run = 1;
    longest = Math.max(longest, run);
  }

  return { current: run, longest };
}

export function addDailyCompletion(
  completions: DailyCompletion[],
  date: string,
  xpAwarded: number,
  now = new Date(),
): DailyCompletion[] {
  if (completions.some((completion) => completion.date === date)) return completions;
  return [...completions, { date, completedAt: now.toISOString(), xpAwarded }];
}
