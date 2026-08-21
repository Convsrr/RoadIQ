import { NextResponse } from "next/server";
import { analyticsEventSchema } from "@/lib/validation/api";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = analyticsEventSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid event." }, { status: 400 });
  return NextResponse.json({ accepted: true, mode: "mock" }, { status: 202 });
}
