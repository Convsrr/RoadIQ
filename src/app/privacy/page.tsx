import type { Metadata } from "next";
import { EditorialPage } from "@/components/roadiq/editorial-page";

export const metadata: Metadata = { title: "Privacy" };

export default function PrivacyPage() {
  return <EditorialPage title="Privacy" eyebrow="Plain-language placeholder"><p className="text-xl leading-8 text-foreground">Mock mode stores your anonymous RoadIQ progress in this browser. RoadIQ does not use device fingerprinting.</p><section><h2 className="text-lg font-semibold text-foreground">Data on this device</h2><p className="mt-2">Answers, XP, streaks, reactions and appearance settings remain in local storage until you reset them or clear browser data.</p></section><section><h2 className="text-lg font-semibold text-foreground">Connected mode</h2><p className="mt-2">A future Supabase connection can store an anonymous account, responses and profile data. The production operator must replace this placeholder with reviewed privacy terms before collecting live account data.</p></section></EditorialPage>;
}
