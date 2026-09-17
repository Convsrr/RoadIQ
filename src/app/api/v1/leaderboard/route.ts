import { NextResponse } from "next/server";
import { LEADERBOARD_FIXTURES } from "@/data/leaderboard";
import { api } from "../../../../../convex/_generated/api";
import { getConvexClient, isConvexBackendEnabled } from "@/lib/convex/server";
import { actorIdFromRequest } from "@/lib/repositories/mock-progress.server";

export async function GET(request: Request) {
  const period = new URL(request.url).searchParams.get("period");
  if (isConvexBackendEnabled()) {
    const sessionId = actorIdFromRequest(request);
    const result = await getConvexClient().query(api.leaderboard.list, {
      period: period === "all" ? "all" : "week",
      ...(sessionId ? { sessionId } : {}),
    });
    return NextResponse.json({ ...result, mode: "convex" }, { headers: { "Cache-Control": "no-store" } });
  }
  const entries = period === "all" ? LEADERBOARD_FIXTURES : LEADERBOARD_FIXTURES.map((entry) => ({
    ...entry,
    xp: Math.round(entry.xp * 0.18),
  }));
  return NextResponse.json({ entries, period: period === "all" ? "all" : "week", mode: "mock" });
}
