import type { AnswerPercentage } from "@/lib/domain/types";

export function calculatePercentages(
  votes: Record<string, number>,
  selectedAnswerId?: string,
): AnswerPercentage[] {
  const nextVotes = { ...votes };
  if (selectedAnswerId) nextVotes[selectedAnswerId] = (nextVotes[selectedAnswerId] ?? 0) + 1;
  const total = Object.values(nextVotes).reduce((sum, count) => sum + count, 0);
  const entries = Object.entries(nextVotes);
  if (total === 0) return entries.map(([answerId]) => ({ answerId, count: 0, percentage: 0 }));

  const raw = entries.map(([answerId, count]) => ({
    answerId,
    count,
    exact: (count / total) * 100,
  }));
  const floored = raw.map((item) => ({ ...item, percentage: Math.floor(item.exact) }));
  let remainder = 100 - floored.reduce((sum, item) => sum + item.percentage, 0);
  const byFraction = [...floored].sort(
    (a, b) => b.exact - b.percentage - (a.exact - a.percentage),
  );
  for (let index = 0; index < remainder; index += 1) {
    const item = byFraction[index % byFraction.length];
    item.percentage += 1;
  }
  remainder = 0;
  return entries.map(([answerId]) => {
    const item = byFraction.find((candidate) => candidate.answerId === answerId)!;
    return { answerId, count: item.count, percentage: item.percentage + remainder };
  });
}
