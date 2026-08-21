import type { MetadataRoute } from "next";
import { listPublicChallenges } from "@/data/challenges.server";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const staticRoutes = ["", "/daily", "/leaderboard", "/about", "/privacy", "/terms"];
  return [
    ...staticRoutes.map((route) => ({ url: `${base}${route}`, changeFrequency: route === "" ? "daily" as const : "weekly" as const, priority: route === "" ? 1 : 0.6 })),
    ...listPublicChallenges().map((challenge) => ({ url: `${base}/c/${challenge.slug}`, changeFrequency: "monthly" as const, priority: 0.7 })),
  ];
}
