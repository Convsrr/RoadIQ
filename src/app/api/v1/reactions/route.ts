import { NextResponse } from "next/server";
import { reactionSchema } from "@/lib/validation/api";
import { api } from "../../../../../convex/_generated/api";
import { getConvexClient, isConvexBackendEnabled } from "@/lib/convex/server";
import { actorIdFromRequest } from "@/lib/repositories/mock-progress.server";

export async function PUT(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = reactionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid reaction." }, { status: 400 });
  }
  if (isConvexBackendEnabled()) {
    const actorId = actorIdFromRequest(request);
    if (!actorId) return NextResponse.json({ error: "Anonymous player identity is required." }, { status: 401 });
    const result = await getConvexClient().mutation(api.reactions.setReaction, {
      sessionId: actorId,
      ...parsed.data,
    });
    return NextResponse.json({ ...result, mode: "convex" });
  }
  return NextResponse.json({ reaction: parsed.data, mode: "mock" });
}
