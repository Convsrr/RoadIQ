import "server-only";

import { timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { isConvexBackendEnabled } from "@/lib/convex/server";

export const IMAGE_FACTORY_SESSION_COOKIE = "roadiq_image_factory_session";

function secretMatches(value: string | undefined, expected: string | undefined): boolean {
  if (!value || !expected) return false;
  const candidate = Buffer.from(value);
  const secret = Buffer.from(expected);
  return candidate.length === secret.length && timingSafeEqual(candidate, secret);
}

export function isImageFactoryConfigured(): boolean {
  return isConvexBackendEnabled() &&
    process.env.ROADIQ_IMAGE_FACTORY_ENABLED === "1" &&
    Boolean(process.env.ROADIQ_IMAGE_FACTORY_TOKEN);
}

export function isValidImageFactoryToken(token: string | undefined): boolean {
  return secretMatches(token, process.env.ROADIQ_IMAGE_FACTORY_TOKEN);
}

export async function hasImageFactorySession(): Promise<boolean> {
  return isValidImageFactoryToken((await cookies()).get(IMAGE_FACTORY_SESSION_COOKIE)?.value);
}

export function imageFactoryOperatorToken(): string {
  const token = process.env.ROADIQ_IMAGE_FACTORY_TOKEN;
  if (!token) throw new Error("IMAGE_FACTORY_NOT_CONFIGURED");
  return token;
}
