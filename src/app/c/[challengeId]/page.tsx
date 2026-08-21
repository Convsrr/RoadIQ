import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ChallengeFeed } from "@/components/roadiq/challenge-feed";
import { findPublicChallenge, listPublicChallenges } from "@/data/challenges.server";

type Props = { params: Promise<{ challengeId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { challengeId } = await params;
  const challenge = findPublicChallenge(challengeId);
  if (!challenge) return { title: "Challenge not found" };
  return {
    title: challenge.question,
    description: "Make your call, then see how other drivers answered.",
    alternates: { canonical: `/c/${challenge.slug}` },
    openGraph: {
      title: challenge.question,
      description: "What would you do? Make the call on RoadIQ.",
      type: "website",
    },
    twitter: { card: "summary_large_image", title: challenge.question, description: "What would you do?" },
  };
}

export default async function ChallengePage({ params }: Props) {
  const { challengeId } = await params;
  const challenge = findPublicChallenge(challengeId);
  if (!challenge) notFound();
  return <ChallengeFeed challenges={listPublicChallenges()} mode="direct" directChallengeId={challenge.id} />;
}
