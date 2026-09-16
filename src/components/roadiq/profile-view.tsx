"use client";

import { BookOpen, Check, Eye, Flame, Medal, ParkingCircle, RotateCcw, Target, Trophy } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { PageHeader } from "@/components/roadiq/page-header";
import { ACHIEVEMENTS } from "@/lib/services/achievements";
import { CATEGORIES, type LocalProgress, type ThemePreference } from "@/lib/domain/types";
import { LocalProgressRepository } from "@/lib/repositories/local-progress";
import { playerSnapshot } from "@/lib/services/player";
import { cn } from "@/lib/utils";

const achievementIcons = { parking: ParkingCircle, eye: Eye, target: Target, "book-open": BookOpen, medal: Medal, flame: Flame } as const;

export function ProfileView() {
  const repository = useMemo(() => new LocalProgressRepository(), []);
  const { setTheme } = useTheme();
  const [progress, setProgress] = useState<LocalProgress | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  useEffect(() => {
    const stored = repository.load();
    queueMicrotask(() => setProgress(stored));
  }, [repository]);
  if (!progress) return <div className="min-h-dvh" />;
  const snapshot = playerSnapshot(progress);
  const accuracy = snapshot.objectiveAccuracy === null ? "—" : `${Math.round(snapshot.objectiveAccuracy * 100)}%`;

  function changeTheme(theme: ThemePreference) {
    const next = repository.setTheme(progress!, theme);
    setProgress(next);
    setTheme(theme);
  }

  function reset() {
    repository.clear();
    const next = repository.load();
    setProgress(next);
    setResetOpen(false);
  }

  return (
    <div>
      <PageHeader eyebrow="Your performance" title="Profile" description="RoadIQ measures judgement. XP records the work you put in." />
      <section className="mx-auto max-w-6xl space-y-5 px-4 pb-28 sm:px-5">
        <div className="overflow-hidden rounded-[1.35rem] border border-border bg-card p-5 sm:p-7">
          <div className="flex items-center gap-4">
            <div className="grid size-16 place-items-center rounded-full bg-primary text-xl font-semibold text-primary-foreground">{snapshot.username.split(" ").map((part) => part[0]).join("").slice(0, 2)}</div>
            <div>
              <h2 className="text-xl font-semibold">{snapshot.username}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{snapshot.rank.calibrated ? snapshot.rank.name : "Rookie · Calibrating"}</p>
            </div>
          </div>
          <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ["RoadIQ", snapshot.roadIqScore],
              ["XP", snapshot.xp.toLocaleString()],
              ["Answered", snapshot.challengesAnswered],
              ["Accuracy", accuracy],
            ].map(([label, value]) => (
              <div key={label} className="rounded-[1rem] border border-border bg-background p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.13em] text-muted-foreground">{label}</p>
                <p className="mt-1 font-mono text-2xl font-semibold tracking-tight">{value}</p>
              </div>
            ))}
          </div>
          <div className="mt-5">
            <div className="mb-2 flex justify-between text-xs"><span>{snapshot.rank.name}</span><span className="text-muted-foreground">{snapshot.rank.nextName ?? "Top rank"}</span></div>
            <div className="h-2 overflow-hidden rounded-full bg-secondary"><div className="h-full rounded-full bg-primary" style={{ width: `${snapshot.rank.progress * 100}%` }} /></div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-[1.25rem] border border-border bg-card p-5">
            <p className="text-xs font-bold uppercase tracking-[0.15em] text-muted-foreground">Daily form</p>
            <div className="mt-4 flex items-center gap-5">
              <div><p className="font-mono text-3xl font-semibold">{snapshot.currentStreak}</p><p className="text-xs text-muted-foreground">Current streak</p></div>
              <div className="h-10 w-px bg-border" />
              <div><p className="font-mono text-3xl font-semibold">{snapshot.longestStreak}</p><p className="text-xs text-muted-foreground">Longest streak</p></div>
            </div>
          </div>
          <div className="rounded-[1.25rem] border border-border bg-card p-5">
            <p className="text-xs font-bold uppercase tracking-[0.15em] text-muted-foreground">Standing</p>
            <div className="mt-4 flex items-center gap-3"><Trophy className="size-8 text-primary" aria-hidden="true" /><div><p className="font-semibold">Demo percentile unavailable</p><p className="text-xs text-muted-foreground">Live ranking needs 100 calibrated profiles.</p></div></div>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-[1.25rem] border border-border bg-card p-5">
          <h2 className="text-lg font-semibold">Category performance</h2>
          <div className="mt-5 space-y-4">
            {CATEGORIES.map((category) => {
              const item = snapshot.categoryPerformance.find((entry) => entry.category === category);
              const percentage = item?.accuracy === null || !item ? 0 : Math.round(item.accuracy * 100);
              return <div key={category}><div className="mb-2 flex justify-between text-sm"><span>{category}</span><span className="font-mono text-muted-foreground">{item?.attempted ? `${percentage}%` : "No calls"}</span></div><div className="h-1.5 overflow-hidden rounded-full bg-secondary"><div className="h-full rounded-full bg-primary" style={{ width: `${percentage}%` }} /></div></div>;
            })}
          </div>
        </div>

        <div className="rounded-[1.25rem] border border-border bg-card p-5">
          <h2 className="text-lg font-semibold">Achievements</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {ACHIEVEMENTS.map((achievement) => {
              const earned = snapshot.achievements.some((item) => item.achievementId === achievement.id);
              const Icon = achievementIcons[achievement.icon as keyof typeof achievementIcons] ?? Medal;
              return <div key={achievement.id} className={cn("flex gap-3 rounded-[1rem] border bg-background p-4", earned ? "border-foreground/25" : "opacity-55") }><div className={cn("grid size-10 shrink-0 place-items-center rounded-full", earned ? "bg-primary text-primary-foreground" : "bg-secondary")}>{earned ? <Check className="size-4" /> : <Icon className="size-4" />}</div><div><p className="text-sm font-semibold">{achievement.name}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{achievement.description}</p></div></div>;
            })}
          </div>
        </div>
        </div>

        <div className="rounded-[1.25rem] border border-border bg-card p-5">
          <h2 className="text-lg font-semibold">Appearance</h2>
          <div className="mt-4 flex flex-wrap gap-2">{(["system", "dark", "light"] as ThemePreference[]).map((theme) => <Button key={theme} variant={progress.theme === theme ? "default" : "outline"} size="sm" onClick={() => changeTheme(theme)} className="capitalize">{theme}</Button>)}</div>
          <div className="mt-6 border-t border-border pt-5"><Button variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setResetOpen(true)}><RotateCcw className="size-4" />Reset local progress</Button></div>
        </div>
      </section>
      <Dialog open={resetOpen} onOpenChange={setResetOpen}><DialogContent><DialogTitle>Reset your RoadIQ?</DialogTitle><DialogDescription>This removes answers, XP, streaks and preferences stored on this device. You cannot undo this action.</DialogDescription><div className="mt-6 flex gap-2"><Button variant="outline" className="flex-1" onClick={() => setResetOpen(false)}>Cancel</Button><Button variant="danger" className="flex-1" onClick={reset}>Reset</Button></div></DialogContent></Dialog>
    </div>
  );
}
