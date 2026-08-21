import { NextResponse } from "next/server";
import { LEADERBOARD_FIXTURES } from "@/data/leaderboard";

export async function GET(request: Request) {
  const period = new URL(request.url).searchParams.get("period");
  const entries = period === "all" ? LEADERBOARD_FIXTURES : LEADERBOARD_FIXTURES.map((entry) => ({
    ...entry,
    xp: Math.round(entry.xp * 0.18),
  }));
  return NextResponse.json({ entries, period: period === "all" ? "all" : "week", mode: "mock" });
}
