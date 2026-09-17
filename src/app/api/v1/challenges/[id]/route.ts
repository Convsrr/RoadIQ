import { NextResponse } from "next/server";
import { findPublicChallenge } from "@/data/challenges.server";
import { api } from "../../../../../../convex/_generated/api";
import { getConvexClient, isConvexBackendEnabled } from "@/lib/convex/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (isConvexBackendEnabled()) {
    const challenge = await getConvexClient().query(api.challenges.getByIdOrSlug, { idOrSlug: id });
    if (!challenge) return NextResponse.json({ error: "Challenge not found" }, { status: 404 });
    return NextResponse.json({ challenge, mode: "convex" }, { headers: { "Cache-Control": "no-store" } });
  }
  const challenge = findPublicChallenge(id);
  if (!challenge) return NextResponse.json({ error: "Challenge not found" }, { status: 404 });
  return NextResponse.json({ challenge, mode: "mock" });
}
