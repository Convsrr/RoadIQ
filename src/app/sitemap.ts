import type { MetadataRoute } from "next";
import { listPublicChallenges } from "@/data/challenges.server";
import { siteUrl } from "@/lib/site-url";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  const staticRoutes = ["", "/daily", "/leaderboard", "/about", "/privacy", "/terms"];
  return [
    ...staticRoutes.map((route) => ({ url: `${base}${route}`, changeFrequency: route === "" ? "daily" as const : "weekly" as const, priority: route === "" ? 1 : 0.6 })),
    ...listPublicChallenges().map((challenge) => ({ url: `${base}/c/${challenge.slug}`, changeFrequency: "monthly" as const, priority: 0.7 })),
  ];
}
