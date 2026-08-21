import { NextResponse } from "next/server";
import { listPublicChallenges } from "@/data/challenges.server";
import { dailyChallengeIds } from "@/lib/services/feed";
import { localDateKey } from "@/lib/services/streaks";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const date = url.searchParams.get("date") ?? localDateKey();
  const challenges = listPublicChallenges();
  const ids = dailyChallengeIds(challenges, date);
  return NextResponse.json({
    daily: {
      date,
      challengeIds: ids,
      challenges: ids.map((id) => challenges.find((challenge) => challenge.id === id)),
    },
    mode: "mock",
  });
}
