import { NextResponse } from "next/server";
import { findPublicChallenge } from "@/data/challenges.server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const challenge = findPublicChallenge(id);
  if (!challenge) return NextResponse.json({ error: "Challenge not found" }, { status: 404 });
  return NextResponse.json({ challenge, mode: "mock" });
}
