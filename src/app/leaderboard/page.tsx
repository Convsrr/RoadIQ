import type { Metadata } from "next";
import { LeaderboardView } from "@/components/roadiq/leaderboard-view";

export const metadata: Metadata = { title: "Leaderboard", description: "See this week's most active RoadIQ drivers." };

export default function LeaderboardPage() {
  return <LeaderboardView />;
}
