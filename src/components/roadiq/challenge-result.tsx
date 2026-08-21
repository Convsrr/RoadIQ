"use client";

import { Check, ThumbsDown, ThumbsUp, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ShareChallenge } from "@/components/roadiq/share-challenge";
import type { ChallengeResult as Result, PublicChallenge, Reaction } from "@/lib/domain/types";
import { cn } from "@/lib/utils";

export function ChallengeResult({
  challenge,
  result,
  actorId,
  reaction,
  onReact,
}: {
  challenge: PublicChallenge;
  result: Result;
  actorId: string;
  reaction?: Reaction;
  onReact: (reaction: Reaction) => void;
}) {
  const community = challenge.challengeType === "community";
  const selectedWon = result.selectedAnswerId === result.majorityAnswerId;
  const status = community
    ? selectedWon
      ? `${result.majorityAgreement}% agree with you`
      : "You went against the majority"
    : result.isCorrect
      ? "Correct"
      : "Not quite";

  return (
    <section className="animate-rise-in space-y-5" aria-live="polite" aria-label="Challenge result">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <span className={cn("grid size-8 place-items-center rounded-full", community || result.isCorrect ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive") }>
            {community || result.isCorrect ? <Check className="size-4" aria-hidden="true" /> : <X className="size-4" aria-hidden="true" />}
          </span>
          <h2 className="text-xl font-semibold tracking-tight">{status}</h2>
        </div>
        <div className="rounded-full bg-primary/12 px-3 py-1.5 text-sm font-bold text-primary">
          +{result.xpAwarded} XP
        </div>
      </div>

      <div className="space-y-2.5">
        {challenge.answers.map((answer, index) => {
          const percentage = result.percentages.find((item) => item.answerId === answer.id)?.percentage ?? 0;
          const selected = answer.id === result.selectedAnswerId;
          const correct = answer.id === result.correctAnswerId;
          return (
            <div key={answer.id} className={cn("relative overflow-hidden rounded-xl border bg-card/70 px-4 py-3", selected && "border-primary/50") }>
              <div className="absolute inset-y-0 left-0 bg-primary/12 animate-bar-in" style={{ width: `${percentage}%`, animationDelay: `${index * 60}ms` }} />
              <div className="relative flex items-center justify-between gap-3 text-sm">
                <span className="flex items-center gap-2 font-medium">
                  {answer.text}
                  {selected && <span className="text-[10px] font-bold uppercase tracking-wider text-primary">Your answer</span>}
                  {!community && correct && <Check className="size-4 text-success" aria-label="Correct answer" />}
                </span>
                <span className="font-mono font-semibold tabular-nums">{percentage}%</span>
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-xs font-medium text-muted-foreground">{result.totalResponses.toLocaleString()} drivers answered</p>

      <div className="rounded-2xl bg-secondary/65 p-4">
        <p className="text-sm leading-6 text-foreground/90">{challenge.explanation}</p>
      </div>

      <div className="flex items-center justify-between gap-4 rounded-2xl border border-border/80 px-4 py-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">RoadIQ</p>
          <div className="mt-0.5 flex items-baseline gap-2">
            <strong className="font-mono text-2xl tracking-tight">{result.roadIqScore}</strong>
            <span className="text-xs text-muted-foreground">
              {result.roadIqScore - result.previousRoadIqScore >= 0 ? "+" : ""}{result.roadIqScore - result.previousRoadIqScore}
            </span>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold">{result.rank.calibrated ? result.rank.name : "Calibrating"}</p>
          <p className="text-xs text-muted-foreground">{result.totalXp.toLocaleString()} XP total</p>
        </div>
      </div>

      {result.newlyEarnedAchievements.length > 0 && (
        <div className="rounded-2xl border border-primary/35 bg-primary/8 p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-primary">Achievement unlocked</p>
          <p className="mt-1 font-semibold">{result.newlyEarnedAchievements[0].name}</p>
          <p className="mt-1 text-sm text-muted-foreground">{result.newlyEarnedAchievements[0].description}</p>
        </div>
      )}

      <div className="flex items-center justify-between gap-3 border-t border-border/70 pt-4">
        <ShareChallenge challenge={challenge} actorId={actorId} />
        <div className="flex items-center gap-1" aria-label="Rate this challenge">
          <Button type="button" variant="ghost" size="icon" aria-label="Good challenge" aria-pressed={reaction === "positive"} className={reaction === "positive" ? "text-primary" : undefined} onClick={() => onReact("positive") }>
            <ThumbsUp className="size-[18px]" aria-hidden="true" />
          </Button>
          <Button type="button" variant="ghost" size="icon" aria-label="Poor challenge" aria-pressed={reaction === "negative"} className={reaction === "negative" ? "text-primary" : undefined} onClick={() => onReact("negative") }>
            <ThumbsDown className="size-[18px]" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </section>
  );
}
