"use client";

import { Check, Download, Share2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { PublicChallenge } from "@/lib/domain/types";
import { trackEvent } from "@/lib/analytics/client";

export function ShareChallenge({ challenge, actorId }: { challenge: PublicChallenge; actorId: string }) {
  const [copied, setCopied] = useState(false);
  const canonical = typeof window === "undefined" ? `/c/${challenge.slug}` : `${window.location.origin}/c/${challenge.slug}`;

  async function share() {
    const payload = {
      title: "RoadIQ challenge",
      text: challenge.question,
      url: canonical,
    };
    try {
      if (navigator.share) await navigator.share(payload);
      else {
        await navigator.clipboard.writeText(canonical);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1800);
      }
      void trackEvent("challenge_shared", actorId, challenge.id);
    } catch {
      // A cancelled share needs no error state.
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button type="button" variant="outline" size="sm" onClick={share}>
        {copied ? <Check className="size-4" aria-hidden="true" /> : <Share2 className="size-4" aria-hidden="true" />}
        {copied ? "Link copied" : "Share challenge"}
      </Button>
      <Button asChild variant="ghost" size="sm">
        <a href={`/api/share-card/${challenge.slug}`} download>
          <Download className="size-4" aria-hidden="true" />
          Share card
        </a>
      </Button>
      <span className="sr-only" aria-live="polite">{copied ? "Challenge link copied" : ""}</span>
    </div>
  );
}
