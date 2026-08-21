"use client";

import type { AnalyticsEventName } from "@/lib/domain/types";

export async function trackEvent(
  name: AnalyticsEventName,
  actorId: string,
  challengeId?: string,
  context?: Record<string, string | number | boolean | null>,
): Promise<void> {
  const event = {
    id: globalThis.crypto.randomUUID(),
    name,
    actorId,
    challengeId,
    occurredAt: new Date().toISOString(),
    context,
  };
  if (process.env.NODE_ENV === "development") console.info("[RoadIQ analytics]", event);
  try {
    await fetch("/api/v1/events", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(event),
      keepalive: true,
    });
  } catch {
    // Analytics must never block gameplay.
  }
}
