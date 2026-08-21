import { ChallengeFeed } from "@/components/roadiq/challenge-feed";
import { listPublicChallenges } from "@/data/challenges.server";

export default function HomePage() {
  return <ChallengeFeed challenges={listPublicChallenges()} />;
}
