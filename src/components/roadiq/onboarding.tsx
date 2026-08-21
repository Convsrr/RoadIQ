"use client";

import { ArrowRight, Gauge, ScanLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RoadIQLogo } from "@/components/roadiq/logo";

export function Onboarding({ onStart }: { onStart: () => void }) {
  return (
    <section className="safe-top safe-bottom mx-auto flex min-h-dvh max-w-lg flex-col px-5">
      <RoadIQLogo className="mt-2" />
      <div className="my-auto py-12">
        <div className="mb-8 grid h-44 place-items-center overflow-hidden rounded-[2rem] border border-border bg-[radial-gradient(circle_at_40%_30%,rgba(255,104,70,.2),transparent_35%),linear-gradient(145deg,#242428,#111113)] shadow-[0_30px_90px_rgba(0,0,0,.3)]" aria-hidden="true">
          <div className="relative grid size-24 place-items-center rounded-full border border-white/15">
            <div className="absolute inset-3 rounded-full border border-dashed border-white/15" />
            <Gauge className="size-10 text-primary" strokeWidth={1.5} />
            <ScanLine className="absolute -right-5 -top-4 size-8 text-white/30" />
          </div>
        </div>
        <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-primary">Visual driving judgement</p>
        <h1 className="text-balance text-[clamp(2.5rem,11vw,4.6rem)] font-bold leading-[0.94] tracking-[-0.065em]">How good a driver are you, really?</h1>
        <p className="mt-5 max-w-md text-base leading-7 text-muted-foreground">Real situations. Split-second decisions. See how your RoadIQ compares.</p>
      </div>
      <Button size="lg" className="mb-3 w-full text-base" onClick={onStart}>
        Start
        <ArrowRight className="size-5" aria-hidden="true" />
      </Button>
      <p className="text-center text-xs leading-5 text-muted-foreground">No account needed. Your progress stays on this device.</p>
    </section>
  );
}
