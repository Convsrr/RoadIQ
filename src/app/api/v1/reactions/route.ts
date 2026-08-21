import { NextResponse } from "next/server";
import { reactionSchema } from "@/lib/validation/api";

export async function PUT(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = reactionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid reaction." }, { status: 400 });
  }
  return NextResponse.json({ reaction: parsed.data, mode: "mock" });
}
