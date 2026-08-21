import type { Metadata } from "next";
import { EditorialPage } from "@/components/roadiq/editorial-page";

export const metadata: Metadata = { title: "About", description: "RoadIQ turns real automotive moments into fast judgement challenges." };

export default function AboutPage() {
  return <EditorialPage title="Make the call." eyebrow="About RoadIQ"><p className="text-xl leading-8 text-foreground">RoadIQ is a visual judgement game for drivers and car people. You see a real situation, choose your answer and compare it with the community.</p><section><h2 className="text-lg font-semibold text-foreground">See it. Choose. Compare.</h2><p className="mt-2">The image comes first. Questions stay short. Results appear in place, so the next challenge never feels far away.</p></section><section><h2 className="text-lg font-semibold text-foreground">Your two scores</h2><p className="mt-2">XP measures activity. RoadIQ measures performance across objective challenges, difficulty and category breadth. Neither score represents a real-world driving qualification.</p></section><section className="rounded-2xl border border-border bg-card/65 p-5"><h2 className="font-semibold text-foreground">Entertainment disclaimer</h2><p className="mt-2">RoadIQ is an entertainment product. It does not provide professional driving, legal, insurance or road-safety advice. Follow applicable road laws, official guidance and professional instruction.</p></section></EditorialPage>;
}
