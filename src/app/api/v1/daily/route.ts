import { NextResponse } from "next/server";
import { listPublicChallenges } from "@/data/challenges.server";
import { dailyChallengeIds } from "@/lib/services/feed";
import { localDateKey } from "@/lib/services/streaks";
import { api } from "../../../../../convex/_generated/api";
import { getConvexClient, isConvexBackendEnabled } from "@/lib/convex/server";
import { actorIdFromRequest } from "@/lib/repositories/mock-progress.server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const date = url.searchParams.get("date") ?? localDateKey();
  if (isConvexBackendEnabled()) {
    const sessionId = actorIdFromRequest(request) ?? "roadiq-preview-session";
    const result = await getConvexClient().query(api.daily.getDaily, { sessionId, date });
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  }
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
