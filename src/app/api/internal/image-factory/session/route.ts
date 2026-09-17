import { NextResponse } from "next/server";
import {
  IMAGE_FACTORY_SESSION_COOKIE,
  isImageFactoryConfigured,
  isValidImageFactoryToken,
} from "@/lib/image-factory/operator.server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isImageFactoryConfigured()) return new Response(null, { status: 404 });
  const body = await request.json().catch(() => null) as { token?: unknown } | null;
  if (!body || typeof body.token !== "string" || body.token.length > 500 || !isValidImageFactoryToken(body.token)) {
    return NextResponse.json({ error: "Access token was not accepted." }, { status: 401 });
  }
  const response = NextResponse.json({ authenticated: true });
  response.cookies.set({
    name: IMAGE_FACTORY_SESSION_COOKIE,
    value: body.token,
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ authenticated: false });
  response.cookies.set({
    name: IMAGE_FACTORY_SESSION_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return response;
}
