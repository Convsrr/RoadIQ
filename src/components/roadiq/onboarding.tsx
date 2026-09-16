"use client";

import { ArrowRight, Check, MousePointer2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { RoadIQLogo } from "@/components/roadiq/logo";
import type { PublicChallenge } from "@/lib/domain/types";
import { cn } from "@/lib/utils";

const CARD_STYLES = [
  "bg-[radial-gradient(circle_at_30%_25%,#c9f26b,transparent_28%),linear-gradient(145deg,#dfe9d4,#50604a)]",
  "bg-[linear-gradient(135deg,transparent_38%,rgba(255,255,255,.75)_39%,rgba(255,255,255,.75)_42%,transparent_43%),linear-gradient(145deg,#1e252c,#5f7b8c)]",
  "bg-[radial-gradient(circle_at_50%_24%,#f3e9d2,transparent_25%),linear-gradient(160deg,#7791a0,#263942_68%)]",
  "bg-[linear-gradient(125deg,transparent_40%,rgba(255,255,255,.28)_41%,rgba(255,255,255,.28)_44%,transparent_45%),linear-gradient(155deg,#b9c0ca,#363b43)]",
  "bg-[radial-gradient(circle_at_58%_38%,#f7a560,transparent_20%),linear-gradient(145deg,#40261c,#13100f)]",
] as const;

const DESKTOP_POSITIONS = [
  "left-[2%] top-[24%] -rotate-[9deg]",
  "left-[20%] top-[10%] -rotate-[4deg]",
  "left-1/2 top-0 -translate-x-1/2 rotate-[1deg]",
  "right-[20%] top-[10%] rotate-[5deg]",
  "right-[2%] top-[24%] rotate-[10deg]",
] as const;

function QuestionArtwork({ challenge, index }: { challenge: PublicChallenge; index: number }) {
  return (
    <>
      <span className={cn("absolute inset-0", CARD_STYLES[index])} aria-hidden="true" />
      <span className="absolute left-1/2 top-[18%] h-[115%] w-8 -translate-x-1/2 rotate-[12deg] border-x border-white/20 bg-black/15" aria-hidden="true">
        <span className="mx-auto block h-full w-px border-l border-dashed border-white/45" />
      </span>
      <span className="absolute inset-x-2 bottom-2 rounded-[.7rem] bg-black/72 px-2.5 py-2 text-left text-white backdrop-blur">
        <span className="block truncate text-[8px] font-semibold uppercase tracking-wider text-white/65 sm:text-[9px]">{challenge.difficulty}</span>
        <span className="mt-0.5 line-clamp-2 block text-[9px] font-medium leading-tight sm:text-[10px]">{challenge.question}</span>
      </span>
    </>
  );
}

export function Onboarding({ onStart, challenges }: { onStart: (challengeId: string) => void; challenges: PublicChallenge[] }) {
  const previews = challenges.slice(0, 5);
  const [activeIndex, setActiveIndex] = useState(Math.min(2, previews.length - 1));
  const mobileDeckRef = useRef<HTMLDivElement | null>(null);
  const mobileCardRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const activeChallenge = previews[activeIndex] ?? previews[0];

  useEffect(() => {
    const container = mobileDeckRef.current;
    const card = mobileCardRefs.current[activeIndex];
    if (!container || !card) return;
    const left = card.offsetLeft - (container.clientWidth - card.clientWidth) / 2;
    if (Math.abs(container.scrollLeft - left) > 2) container.scrollTo({ left });
  }, [activeIndex]);

  function selectMobileCard(index: number) {
    setActiveIndex(index);
    mobileCardRefs.current[index]?.scrollIntoView({ block: "nearest", inline: "center" });
  }

  function updateMobileSelection(container: HTMLDivElement) {
    const center = container.getBoundingClientRect().left + container.clientWidth / 2;
    let closestIndex = activeIndex;
    let closestDistance = Number.POSITIVE_INFINITY;
    mobileCardRefs.current.forEach((card, index) => {
      if (!card) return;
      const rect = card.getBoundingClientRect();
      const distance = Math.abs(rect.left + rect.width / 2 - center);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex = index;
      }
    });
    if (closestIndex !== activeIndex) setActiveIndex(closestIndex);
  }

  if (!activeChallenge) return null;

  return (
    <section className="safe-top safe-bottom relative isolate flex min-h-dvh overflow-hidden px-5">
      <div className="fine-grid absolute inset-x-0 top-0 -z-20 h-[58%] opacity-45 [mask-image:linear-gradient(to_bottom,black,transparent)]" />
      <div className="absolute left-1/2 top-[19%] -z-10 size-[36rem] -translate-x-1/2 rounded-full bg-secondary/70 blur-3xl" />

      <div className="mx-auto flex w-full max-w-6xl flex-col">
        <header className="flex min-h-14 items-center justify-between">
          <RoadIQLogo />
          <span className="rounded-full border border-border bg-background/80 px-3 py-1.5 text-[11px] font-medium text-muted-foreground backdrop-blur">
            No account needed
          </span>
        </header>

        <div className="my-auto py-8 text-center sm:py-12">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-border bg-background/80 px-3 py-1.5 text-[11px] font-medium text-muted-foreground shadow-sm backdrop-blur">
            <span className="size-1.5 rounded-full bg-success" />
            Daily visual driving challenges
          </div>
          <h1 className="text-display mx-auto mt-5 max-w-[13ch] text-balance text-[clamp(3.2rem,10vw,6.5rem)] font-semibold">
            How good a driver are you, really?
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-balance text-base leading-7 text-muted-foreground sm:text-lg">
            Read real road situations, make the call, and see how your judgement compares with other drivers.
          </p>

          <div className="relative mx-auto mt-9 hidden h-[17rem] max-w-3xl sm:block" role="group" aria-label="Preview RoadIQ questions">
            {previews.map((challenge, index) => {
              const active = index === activeIndex;
              return (
                <button
                  key={challenge.id}
                  type="button"
                  aria-label={`Preview question: ${challenge.question}`}
                  aria-pressed={active}
                  onClick={() => setActiveIndex(index)}
                  onFocus={() => setActiveIndex(index)}
                  onPointerEnter={() => setActiveIndex(index)}
                  className={cn(
                    "absolute h-[14rem] w-[10.4rem] overflow-hidden rounded-[1.3rem] border-[3px] border-background bg-card text-left shadow-[0_24px_50px_rgba(0,0,0,.16)] transition-[transform,filter,opacity] duration-300 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-background motion-reduce:transition-none",
                    DESKTOP_POSITIONS[index],
                    active ? "z-20 scale-[1.08] opacity-100 saturate-100" : "z-0 scale-[.96] opacity-70 saturate-[.75] hover:opacity-90",
                  )}
                >
                  <QuestionArtwork challenge={challenge} index={index} />
                </button>
              );
            })}
          </div>

          <div
            ref={mobileDeckRef}
            className="question-deck-scroll -mx-5 mt-8 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth sm:hidden motion-reduce:scroll-auto"
            style={{ paddingInline: "calc(50% - 5.75rem)" }}
            role="group"
            aria-label="Preview RoadIQ questions"
            onScroll={(event) => updateMobileSelection(event.currentTarget)}
          >
            {previews.map((challenge, index) => {
              const active = index === activeIndex;
              return (
                <button
                  key={challenge.id}
                  ref={(element) => { mobileCardRefs.current[index] = element; }}
                  type="button"
                  aria-label={`Preview question: ${challenge.question}`}
                  aria-pressed={active}
                  onClick={() => selectMobileCard(index)}
                  onFocus={() => selectMobileCard(index)}
                  className={cn(
                    "relative h-[14.5rem] w-[11.5rem] shrink-0 snap-center overflow-hidden rounded-[1.3rem] border-[3px] border-background bg-card text-left shadow-[0_22px_45px_rgba(0,0,0,.14)] transition-[transform,filter,opacity] duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 motion-reduce:transition-none",
                    active ? "scale-100 opacity-100 saturate-100" : "scale-[.92] opacity-65 saturate-[.7]",
                  )}
                >
                  <QuestionArtwork challenge={challenge} index={index} />
                </button>
              );
            })}
          </div>

          <div className="mx-auto mt-5 max-w-xl rounded-[1.2rem] border border-border bg-background/88 p-4 text-left shadow-[0_18px_55px_rgba(0,0,0,.07)] backdrop-blur sm:mt-0 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                {activeChallenge.category} · {activeChallenge.challengeType === "community" ? "Community vote" : "Objective"}
              </p>
              <p className="font-mono text-[10px] text-muted-foreground">{activeIndex + 1} of {previews.length}</p>
            </div>
            <h2 className="mt-2 text-balance text-lg font-semibold leading-snug tracking-[-0.025em] sm:text-xl">
              {activeChallenge.question}
            </h2>
            <p className="mt-2 text-xs text-muted-foreground">
              {activeChallenge.answers.length} choices · Instant explanation
            </p>
          </div>

          <div className="mt-4 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button size="lg" className="w-full px-8 sm:w-auto" onClick={() => onStart(activeChallenge.id)}>
              Try this question
              <ArrowRight className="size-4" aria-hidden="true" />
            </Button>
            <div className="flex items-center gap-2 px-3 text-xs text-muted-foreground">
              <MousePointer2 className="size-3.5" aria-hidden="true" />
              Takes less than 30 seconds
            </div>
          </div>
        </div>

        <footer className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 border-t border-border py-5 text-[11px] text-muted-foreground">
          {["Instant feedback", "Progress saved locally", "Keyboard friendly"].map((item) => (
            <span key={item} className="flex items-center gap-1.5"><Check className="size-3" aria-hidden="true" />{item}</span>
          ))}
        </footer>
      </div>
    </section>
  );
}
