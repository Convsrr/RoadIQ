import type { PublicChallenge, ResponseRecord } from "@/lib/domain/types";

function hash(input: string): number {
  let value = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    value ^= input.charCodeAt(index);
    value = Math.imul(value, 16777619);
  }
  return value >>> 0;
}

export function orderFeed(
  challenges: PublicChallenge[],
  responses: ResponseRecord[],
  actorId: string,
): PublicChallenge[] {
  const answered = new Map(responses.map((response) => [response.challengeId, response]));
  const lastCategories = responses.slice(-2).map((response) => response.category);
  const lastDifficulty = responses.at(-1)?.difficulty;

  return [...challenges].sort((a, b) => {
    const score = (challenge: PublicChallenge) => {
      const unseen = answered.has(challenge.id) ? 0 : 100;
      const variety = lastCategories.includes(challenge.category) ? 0 : 30;
      const difficulty = lastDifficulty === challenge.difficulty ? 0 : 10;
      const stableTie = hash(`${actorId}:${challenge.id}`) / 2 ** 32;
      return unseen + variety + difficulty + stableTie;
    };
    return score(b) - score(a);
  });
}

export function dailyChallengeIds(
  challenges: PublicChallenge[],
  date: string,
  count = 5,
): string[] {
  return [...challenges]
    .sort((a, b) => hash(`${date}:${a.id}`) - hash(`${date}:${b.id}`))
    .slice(0, count)
    .map((challenge) => challenge.id);
}
