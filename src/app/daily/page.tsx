import type { Metadata } from "next";
import { ChallengeFeed } from "@/components/roadiq/challenge-feed";
import { listPublicChallenges } from "@/data/challenges.server";

export const metadata: Metadata = { title: "Daily RoadIQ", description: "Five driving calls. One daily streak." };

export default function DailyPage() {
  return <ChallengeFeed challenges={listPublicChallenges()} mode="daily" />;
}
