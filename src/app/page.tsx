import { ChallengeFeed } from "@/components/roadiq/challenge-feed";
import { listRuntimeChallenges } from "@/lib/repositories/challenges.server";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  return <ChallengeFeed challenges={await listRuntimeChallenges()} />;
}
