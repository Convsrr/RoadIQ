import { NextResponse } from "next/server";
import { analyticsEventSchema } from "@/lib/validation/api";
import { api } from "../../../../../convex/_generated/api";
import { getConvexClient, isConvexBackendEnabled } from "@/lib/convex/server";
import { actorIdFromRequest } from "@/lib/repositories/mock-progress.server";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = analyticsEventSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid event." }, { status: 400 });
  if (isConvexBackendEnabled()) {
    const actorId = actorIdFromRequest(request);
    if (!actorId) return NextResponse.json({ accepted: false, mode: "convex" }, { status: 202 });
    await getConvexClient().mutation(api.analytics.track, {
      sessionId: actorId,
      id: parsed.data.id,
      name: parsed.data.name,
      occurredAt: Date.parse(parsed.data.occurredAt),
      ...(parsed.data.challengeId ? { challengeId: parsed.data.challengeId } : {}),
      ...(parsed.data.context ? { context: parsed.data.context } : {}),
    });
    return NextResponse.json({ accepted: true, mode: "convex" }, { status: 202 });
  }
  return NextResponse.json({ accepted: true, mode: "mock" }, { status: 202 });
}
