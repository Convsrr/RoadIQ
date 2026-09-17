import "server-only";

import { ConvexHttpClient } from "convex/browser";

export function isConvexBackendEnabled(): boolean {
  return process.env.ROADIQ_BACKEND === "convex" && Boolean(process.env.NEXT_PUBLIC_CONVEX_URL);
}

export function getConvexClient(): ConvexHttpClient {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) throw new Error("CONVEX_NOT_CONFIGURED");
  return new ConvexHttpClient(url, { logger: false });
}
