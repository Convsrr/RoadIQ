import type { Metadata } from "next";
import { EditorialPage } from "@/components/roadiq/editorial-page";

export const metadata: Metadata = { title: "Terms" };

export default function TermsPage() {
  return <EditorialPage title="Terms" eyebrow="Product placeholder"><p className="text-xl leading-8 text-foreground">Use RoadIQ as an entertainment game. Scores, votes and explanations do not replace official road guidance or professional advice.</p><section><h2 className="text-lg font-semibold text-foreground">Community questions</h2><p className="mt-2">Community percentages describe how players voted. They do not determine legal, insurance or road liability.</p></section><section><h2 className="text-lg font-semibold text-foreground">Development content</h2><p className="mt-2">Seed photography and fixture response data support product development. The operator must review image rights and replace these terms before a public production launch.</p></section></EditorialPage>;
}
