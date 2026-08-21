import { NextResponse } from "next/server";
import { listPublicChallenges } from "@/data/challenges.server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    { challenges: listPublicChallenges(), mode: "mock" },
    { headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" } },
  );
}
