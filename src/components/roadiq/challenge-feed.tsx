"use client";

import { ArrowRight, LoaderCircle, RotateCcw, SkipForward, Sparkles } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { RoadIQLogo } from "@/components/roadiq/logo";
import { ChallengeImage } from "@/components/roadiq/challenge-image";
import { ChallengeResult } from "@/components/roadiq/challenge-result";
import { Onboarding } from "@/components/roadiq/onboarding";
import { trackEvent } from "@/lib/analytics/client";
import type { ChallengeResult as Result, LocalProgress, PublicChallenge, Reaction } from "@/lib/domain/types";
import { LocalProgressRepository } from "@/lib/repositories/local-progress";
import { dailyChallengeIds, orderFeed } from "@/lib/services/feed";
import { playerSnapshot, shouldShowSignupPrompt } from "@/lib/services/player";
import { localDateKey } from "@/lib/services/streaks";
import { DAILY_COMPLETION_XP } from "@/lib/domain/config";
import { cn } from "@/lib/utils";

type FeedMode = "feed" | "daily" | "direct";

async function hydrateProgressService(progress: LocalProgress): Promise<void> {
  const response = await fetch("/api/v1/me", {
    method: "PUT",
    headers: {
      "content-type": "application/json",
      "x-roadiq-actor-id": progress.actorId,
    },
    body: JSON.stringify({
      responses: progress.responses.map((item) => ({
        challengeId: item.challengeId,
        answerId: item.answerId,
        idempotencyKey: item.idempotencyKey,
        answeredAt: item.answeredAt,
      })),
      dailyDates: progress.dailyCompletions.map((completion) => completion.date),
    }),
  });
  if (!response.ok) throw new Error("PROGRESS_IMPORT_FAILED");
}

export function ChallengeFeed({
  challenges,
  mode = "feed",
  directChallengeId,
}: {
  challenges: PublicChallenge[];
  mode?: FeedMode;
  directChallengeId?: string;
}) {
  const router = useRouter();
  const repository = useMemo(() => new LocalProgressRepository(), []);
  const [progress, setProgress] = useState<LocalProgress | null>(null);
  const [queue, setQueue] = useState<PublicChallenge[]>(challenges);
  const [result, setResult] = useState<Result | null>(null);
  const [selectedAnswerId, setSelectedAnswerId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signupOpen, setSignupOpen] = useState(false);
  const [dailyFinished, setDailyFinished] = useState(false);
  const hydratedActorId = useRef<string | null>(null);
  const touchStartY = useRef<number | null>(null);
  const dailyDate = useMemo(() => localDateKey(), []);

  const current = queue[0] ?? null;
  const snapshot = progress ? playerSnapshot(progress) : null;
  const dailyIds = useMemo(
    () => (mode === "daily" ? dailyChallengeIds(challenges, dailyDate) : []),
    [challenges, dailyDate, mode],
  );
  const dailyCompletedCount = progress
    ? dailyIds.filter((id) => progress.responses.some((response) => response.challengeId === id)).length
    : 0;

  useEffect(() => {
    const stored = repository.load();
    const forceStart = mode !== "feed";
    document.body.dataset.onboarding = String(!stored.started && !forceStart);

    let ordered = mode === "feed" ? orderFeed(challenges, stored.responses, stored.actorId) : challenges;
    if (mode === "direct" && directChallengeId) {
      ordered = [
        ...ordered.filter((challenge) => challenge.id === directChallengeId),
        ...ordered.filter((challenge) => challenge.id !== directChallengeId),
      ];
    }
    if (mode === "daily") {
      const ids = dailyChallengeIds(challenges, dailyDate);
      const dailyChallenges = ids
        .map((id) => challenges.find((challenge) => challenge.id === id))
        .filter((challenge): challenge is PublicChallenge => Boolean(challenge));
      ordered = [
        ...dailyChallenges.filter((challenge) => !stored.responses.some((response) => response.challengeId === challenge.id)),
        ...dailyChallenges.filter((challenge) => stored.responses.some((response) => response.challengeId === challenge.id)),
      ];
      if (ids.every((id) => stored.responses.some((response) => response.challengeId === id))) {
        queueMicrotask(() => {
          setDailyFinished(true);
        });
      }
    }
    queueMicrotask(() => {
      setProgress((currentProgress) => currentProgress ?? stored);
      setQueue(ordered);
    });
    if (hydratedActorId.current !== stored.actorId) {
      hydratedActorId.current = stored.actorId;
      void hydrateProgressService(stored).catch(() => {
        hydratedActorId.current = null;
      });
    }
    void trackEvent("app_opened", stored.actorId, undefined, { mode });
    return () => {
      delete document.body.dataset.onboarding;
    };
  }, [challenges, dailyDate, directChallengeId, mode, repository]);

  useEffect(() => {
    const next = queue[1];
    if (!next) return;
    const image = new window.Image();
    image.src = next.imageUrl;
  }, [queue]);

  const saveProgress = useCallback((next: LocalProgress) => {
    repository.save(next);
    setProgress(next);
  }, [repository]);

  const start = useCallback((challengeId: string) => {
    if (!progress) return;
    setQueue((items) => [
      ...items.filter((challenge) => challenge.id === challengeId),
      ...items.filter((challenge) => challenge.id !== challengeId),
    ]);
    const next = { ...progress, started: true };
    saveProgress(next);
    document.body.dataset.onboarding = "false";
    void trackEvent("onboarding_completed", next.actorId, challengeId, { previewChallengeId: challengeId });
  }, [progress, saveProgress]);

  const answer = useCallback(async (answerId: string) => {
    if (!current || !progress || busy || result) return;
    setSelectedAnswerId(answerId);
    setBusy(true);
    setError(null);
    const idempotencyKey = globalThis.crypto.randomUUID();
    try {
      const response = await fetch("/api/v1/responses", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-roadiq-actor-id": progress.actorId,
        },
        body: JSON.stringify({
          challengeId: current.id,
          answerId,
          idempotencyKey,
        }),
      });
      if (!response.ok) throw new Error("SUBMIT_FAILED");
      const body = (await response.json()) as { result: Result };
      setResult(body.result);
      const alreadySaved = progress.responses.some((item) => item.challengeId === current.id);
      let next: LocalProgress = {
        ...progress,
        responses: alreadySaved ? progress.responses : [...progress.responses, body.result.response],
        viewedChallengeIds: [...new Set([...progress.viewedChallengeIds, current.id])],
      };

      if (mode === "daily") {
        const completedIds = dailyIds.filter((id) => next.responses.some((item) => item.challengeId === id));
        if (completedIds.length === dailyIds.length) {
          const dailyResponse = await fetch("/api/v1/daily/complete", {
            method: "POST",
            headers: {
              "content-type": "application/json",
              "x-roadiq-actor-id": progress.actorId,
            },
            body: JSON.stringify({ date: dailyDate }),
          });
          if (!dailyResponse.ok) throw new Error("DAILY_COMPLETION_FAILED");
          const dailyBody = (await dailyResponse.json()) as {
            daily: {
              completion: LocalProgress["dailyCompletions"][number];
              currentStreak: number;
              longestStreak: number;
              awardedNow: boolean;
            };
          };
          const completions = next.dailyCompletions.some((item) => item.date === dailyDate)
            ? next.dailyCompletions
            : [...next.dailyCompletions, dailyBody.daily.completion];
          next = {
            ...next,
            dailyCompletions: completions,
            currentStreak: dailyBody.daily.currentStreak,
            longestStreak: Math.max(next.longestStreak, dailyBody.daily.longestStreak),
          };
          if (dailyBody.daily.awardedNow) {
            void trackEvent("daily_completed", next.actorId, undefined, { date: dailyDate });
          }
        }
      }
      saveProgress(next);
      void trackEvent("challenge_answered", next.actorId, current.id, { answerId, challengeType: current.challengeType });
      void trackEvent("result_viewed", next.actorId, current.id);
      if (shouldShowSignupPrompt(next)) {
        window.setTimeout(() => setSignupOpen(true), 850);
      }
    } catch {
      setError("Your answer did not save. Check your connection and try again.");
      setSelectedAnswerId(null);
    } finally {
      setBusy(false);
    }
  }, [busy, current, dailyDate, dailyIds, mode, progress, result, saveProgress]);

  const goNext = useCallback(() => {
    if (!result || !progress) return;
    const completesDaily = mode === "daily" && dailyIds.every((id) => progress.responses.some((response) => response.challengeId === id));
    if (completesDaily) {
      setDailyFinished(true);
      setResult(null);
      return;
    }
    setQueue((items) => items.length > 1 ? [...items.slice(1), items[0]] : items);
    setResult(null);
    setSelectedAnswerId(null);
    setError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
    void trackEvent("next_challenge", progress.actorId, current?.id);
  }, [current?.id, dailyIds, mode, progress, result]);

  const skip = useCallback(() => {
    if (!current || !progress || busy || result) return;
    const next = {
      ...progress,
      skippedChallengeIds: [...new Set([...progress.skippedChallengeIds, current.id])],
    };
    saveProgress(next);
    setQueue((items) => items.length > 1 ? [...items.slice(1), items[0]] : items);
    void trackEvent("challenge_skipped", progress.actorId, current.id);
  }, [busy, current, progress, result, saveProgress]);

  const react = useCallback((reaction: Reaction) => {
    if (!current || !progress) return;
    const next = { ...progress, reactions: { ...progress.reactions, [current.id]: reaction } };
    saveProgress(next);
    void fetch("/api/v1/reactions", {
      method: "PUT",
      headers: {
        "content-type": "application/json",
        "x-roadiq-actor-id": progress.actorId,
      },
      body: JSON.stringify({ challengeId: current.id, reaction }),
    });
    void trackEvent("challenge_reacted", progress.actorId, current.id, { reaction });
  }, [current, progress, saveProgress]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target?.matches("input, textarea, select, [contenteditable='true']")) return;
      if (result && (event.key === "ArrowRight" || event.key.toLowerCase() === "n")) {
        event.preventDefault();
        goNext();
        return;
      }
      const number = Number(event.key);
      if (!result && current && number >= 1 && number <= current.answers.length) {
        event.preventDefault();
        void answer(current.answers[number - 1].id);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [answer, current, goNext, result]);

  function dismissSignup() {
    if (!progress) return;
    const next = {
      ...progress,
      lastSignupPromptAt: new Date().toISOString(),
      signupPromptAnswerCount: progress.responses.length,
    };
    saveProgress(next);
    setSignupOpen(false);
  }

  if (!progress) {
    return <div className="grid min-h-[70dvh] place-items-center" aria-label="Loading RoadIQ"><LoaderCircle className="size-7 animate-spin text-primary" /></div>;
  }
  if (!progress.started && mode === "feed") return <Onboarding onStart={start} challenges={challenges} />;

  if (dailyFinished) {
    return (
      <section className="safe-top mx-auto flex min-h-[75dvh] max-w-lg flex-col items-center justify-center px-5 text-center">
        <div className="grid size-20 place-items-center rounded-full bg-primary/12 text-primary"><Sparkles className="size-8" aria-hidden="true" /></div>
        <p className="mt-6 text-xs font-bold uppercase tracking-[0.18em] text-primary">Daily complete</p>
        <h1 className="mt-3 text-4xl font-bold tracking-[-0.05em]">Five calls made.</h1>
        <p className="mt-4 max-w-sm leading-7 text-muted-foreground">+{DAILY_COMPLETION_XP} XP · {progress.currentStreak} day streak. Tomorrow brings a new set.</p>
        <Button className="mt-8" onClick={() => router.push("/")}>
          Continue playing <ArrowRight className="size-4" aria-hidden="true" />
        </Button>
      </section>
    );
  }

  if (!current) {
    return (
      <div className="grid min-h-[70dvh] place-items-center px-6 text-center">
        <div>
          <p className="text-xl font-semibold">No challenge available</p>
          <Button className="mt-5" onClick={() => window.location.reload()}><RotateCcw className="size-4" />Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <article
        className="safe-top mx-auto w-full max-w-6xl px-3 sm:px-5 lg:pt-8"
        onTouchStart={(event) => { touchStartY.current = event.touches[0]?.clientY ?? null; }}
        onTouchEnd={(event) => {
          if (!result || touchStartY.current === null) return;
          const end = event.changedTouches[0]?.clientY ?? touchStartY.current;
          if (touchStartY.current - end > 70) goNext();
          touchStartY.current = null;
        }}
      >
        <header className="mb-4 flex min-h-11 items-center justify-between gap-3 px-1 lg:mb-6">
          <div>
            <RoadIQLogo compact />
            <span className="ml-3 hidden text-[11px] font-medium text-muted-foreground sm:inline">Make the call</span>
          </div>
          {mode === "daily" ? (
            <div className="text-right">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Daily RoadIQ</p>
              <p className="text-sm font-semibold">{dailyCompletedCount} / 5</p>
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">RoadIQ</span>
              <strong className="font-mono text-sm">{snapshot?.roadIqScore ?? 100}</strong>
            </div>
          )}
        </header>

        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.08fr)_minmax(24rem,.92fr)] lg:gap-8">
          <ChallengeImage key={current.id} challenge={current} priority />

        <div className="rounded-[1.4rem] border border-border bg-card p-5 shadow-[0_24px_70px_rgba(0,0,0,.07)] sm:p-6 lg:sticky lg:top-[6.5rem] lg:max-h-[calc(100dvh-8rem)] lg:overflow-y-auto">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              {current.region === "global" ? "Global" : current.region.toUpperCase()} · {current.challengeType === "community" ? "Community call" : "Objective"}
            </p>
            {!result && (
              <Button type="button" variant="ghost" size="sm" className="min-h-9 h-9 px-3" onClick={skip}>
                Skip <SkipForward className="size-4" aria-hidden="true" />
              </Button>
            )}
          </div>
          <h1 className="text-balance text-[clamp(1.75rem,5vw,2.8rem)] font-semibold leading-[1.02] tracking-[-0.055em]">{current.question}</h1>

          {!result ? (
            <div className="mt-5 grid gap-2.5" role="group" aria-label="Choose one answer">
              {current.answers.map((choice, index) => {
                const selected = selectedAnswerId === choice.id;
                return (
                  <button
                    key={choice.id}
                    type="button"
                    disabled={busy}
                    onClick={() => void answer(choice.id)}
                    className={cn(
                      "group flex min-h-14 w-full items-center justify-between rounded-[1rem] border bg-background px-4 py-3 text-left text-[15px] font-medium transition-[background-color,border-color,transform] hover:border-foreground/30 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[.99] disabled:cursor-wait disabled:opacity-70 motion-reduce:transition-none",
                      selected && "border-foreground bg-accent",
                    )}
                  >
                    <span>{choice.text}</span>
                    <span className="grid size-7 shrink-0 place-items-center rounded-full border border-border bg-card font-mono text-[11px] text-muted-foreground group-hover:border-foreground/30 group-hover:text-foreground">
                      {busy && selected ? <LoaderCircle className="size-3.5 animate-spin" aria-label="Saving answer" /> : index + 1}
                    </span>
                  </button>
                );
              })}
              {error && <div role="alert" className="rounded-xl border border-destructive/35 bg-destructive/8 px-4 py-3 text-sm text-destructive">{error}</div>}
              <p className="mt-1 hidden text-center text-[11px] text-muted-foreground sm:block">Press 1–{current.answers.length} to answer</p>
            </div>
          ) : (
            <div className="mt-5">
              <ChallengeResult
                challenge={current}
                result={result}
                actorId={progress.actorId}
                reaction={progress.reactions[current.id]}
                onReact={react}
              />
              <div className="mt-5 rounded-[1.15rem] bg-background p-2">
                <Button size="lg" className="w-full" onClick={goNext}>
                  {mode === "daily" && dailyCompletedCount >= 5 ? "Finish Daily" : "Next challenge"}
                  <ArrowRight className="size-5" aria-hidden="true" />
                </Button>
              </div>
            </div>
          )}
        </div>
        </div>
      </article>

      <Dialog open={signupOpen} onOpenChange={(open) => { if (!open) dismissSignup(); }}>
        <DialogContent>
          <DialogTitle>Save your RoadIQ</DialogTitle>
          <DialogDescription>
            Your RoadIQ is {snapshot?.roadIqScore}. This browser keeps a local copy while the configured RoadIQ backend stores progress anonymously. Account linking is ready for a future RoadIQ sign-in provider.
          </DialogDescription>
          <div className="mt-6 rounded-2xl bg-secondary/70 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">On-device progress</p>
            <p className="mt-1 font-mono text-2xl font-semibold">{snapshot?.challengesAnswered} calls · {snapshot?.xp} XP</p>
          </div>
          <Button className="mt-6 w-full" onClick={dismissSignup}>Keep playing</Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
