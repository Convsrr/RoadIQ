import { NextResponse } from "next/server";
import { listPublicChallenges } from "@/data/challenges.server";
import { api } from "../../../../../../convex/_generated/api";
import { getConvexClient, isConvexBackendEnabled } from "@/lib/convex/server";

export const dynamic = "force-dynamic";

export async function GET() {
  if (isConvexBackendEnabled()) {
    const result = await getConvexClient().query(api.challenges.listPublished, {
      paginationOpts: { numItems: 100, cursor: null },
    });
    return NextResponse.json(
      { challenges: result.page, mode: "convex" },
      { headers: { "Cache-Control": "no-store" } },
    );
  }
  return NextResponse.json(
    { challenges: listPublicChallenges(), mode: "mock" },
    { headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" } },
  );
}
