"use client";

import { Crown } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/roadiq/page-header";
import { LEADERBOARD_FIXTURES } from "@/data/leaderboard";
import type { LeaderboardEntry, LocalProgress } from "@/lib/domain/types";
import { LocalProgressRepository } from "@/lib/repositories/local-progress";
import { playerSnapshot } from "@/lib/services/player";
import { cn } from "@/lib/utils";

function row(entry: LeaderboardEntry) {
  return (
    <div key={entry.id} className={cn("grid grid-cols-[2rem_2.6rem_1fr_auto] items-center gap-3 rounded-[1rem] border px-3 py-3.5", entry.isCurrentUser ? "border-foreground bg-foreground text-background" : "border-border bg-background") }>
      <span className="text-center font-mono text-xs text-muted-foreground">{entry.rank}</span>
      <span className={cn("grid size-10 place-items-center rounded-full text-xs font-semibold", entry.isCurrentUser ? "bg-background/15" : "bg-secondary")}>{entry.initials}</span>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold">{entry.username}{entry.isCurrentUser ? " · You" : ""}</p>
        <p className={cn("text-xs", entry.isCurrentUser ? "text-background/65" : "text-muted-foreground")}>RoadIQ {entry.roadIqScore}</p>
      </div>
      <strong className="font-mono text-sm tabular-nums">{entry.xp.toLocaleString()} <span className="font-sans text-[10px] text-muted-foreground">XP</span></strong>
    </div>
  );
}

export function LeaderboardView() {
  const [period, setPeriod] = useState<"week" | "all">("week");
  const [progress, setProgress] = useState<LocalProgress | null>(null);
  useEffect(() => {
    const stored = new LocalProgressRepository().load();
    queueMicrotask(() => setProgress(stored));
  }, []);
  const entries = useMemo(() => LEADERBOARD_FIXTURES.map((entry) => period === "week" ? { ...entry, xp: Math.round(entry.xp * 0.18) } : entry), [period]);
  const current = progress ? playerSnapshot(progress) : null;
  const currentEntry: LeaderboardEntry | null = current ? {
    id: current.actorId,
    rank: Math.max(13, 220 - Math.floor(current.xp / 50)),
    username: current.username,
    initials: current.username.split(" ").map((part) => part[0]).join("").slice(0, 2),
    xp: period === "week" ? current.xp : current.xp,
    roadIqScore: current.roadIqScore,
    isCurrentUser: true,
  } : null;

  return (
    <div>
      <PageHeader eyebrow="Competition" title="Leaderboard" description="XP rewards the drivers who keep making the call. RoadIQ measures how those calls perform." />
      <section className="mx-auto max-w-6xl px-4 pb-28 sm:px-5">
        <div className="grid gap-6 lg:grid-cols-[16rem_minmax(0,1fr)]">
        <div>
        <div className="inline-flex rounded-full bg-secondary p-1" role="tablist" aria-label="Leaderboard period">
          {(["week", "all"] as const).map((value) => (
            <button key={value} type="button" role="tab" aria-selected={period === value} onClick={() => setPeriod(value)} className={cn("min-h-11 rounded-full px-5 text-sm font-semibold transition-colors", period === value ? "bg-card text-foreground shadow-sm" : "text-muted-foreground")}>{value === "week" ? "This week" : "All time"}</button>
          ))}
        </div>
        <div className="mt-4 flex items-center gap-2 rounded-[1rem] border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
          <Crown className="size-4" aria-hidden="true" />
          Demo leaderboard data
        </div>
        </div>
        <div className="rounded-[1.35rem] border border-border bg-card p-2 sm:p-3"><div className="space-y-2">{entries.map(row)}</div></div>
        {currentEntry && <div className="sticky bottom-24 mt-4 rounded-[1.3rem] bg-background/85 p-2 shadow-2xl backdrop-blur-xl lg:bottom-5">{row(currentEntry)}</div>}
        </div>
      </section>
    </div>
  );
}
