import type { Metadata } from "next";
import { ChallengeFeed } from "@/components/roadiq/challenge-feed";
import { listRuntimeChallenges } from "@/lib/repositories/challenges.server";

export const metadata: Metadata = { title: "Daily RoadIQ", description: "Five driving calls. One daily streak." };

export const dynamic = "force-dynamic";

export default async function DailyPage() {
  return <ChallengeFeed challenges={await listRuntimeChallenges()} mode="daily" />;
}
