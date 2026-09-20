"use client";

import Image from "next/image";
import { Check, ChevronRight, ImagePlus, LoaderCircle, LogOut, RefreshCw, RotateCcw, SlidersHorizontal, Upload, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import type { ImageFactoryDashboard, ImageFactoryReviewItem } from "@/lib/image-factory/contracts";
import { cn } from "@/lib/utils";

type BatchMode = "missing" | "failed_qa" | "unapproved" | "category" | "difficulty";
type Provider = "mock" | "gemini";

const categories = ["Driver IQ", "Parking IQ", "Road IQ", "Who's Wrong?", "Car IQ", "Spot It"];
const difficulties = ["Easy", "Medium", "Hard", "Expert"];
const showMockProvider = process.env.NODE_ENV !== "production";

function statusLabel(value: string): string {
  return value.replaceAll("_", " ");
}

function StatusPill({ value }: { value: string }) {
  return <span className={cn("rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.11em]", value.includes("fail") ? "border-destructive/35 bg-destructive/8 text-destructive" : value.includes("pass") || value === "approved" || value === "published" ? "border-success/30 bg-success/10 text-success" : "border-border bg-secondary text-muted-foreground")}>{statusLabel(value)}</span>;
}

function FactoryImage({ src, alt, position = "50% 50%" }: { src: string; alt: string; position?: string }) {
  if (!src) return <div className="absolute inset-0 grid place-items-center bg-secondary text-xs text-muted-foreground">No image stored</div>;
  return <Image src={src} alt={alt} fill unoptimized sizes="(max-width: 640px) 90vw, 420px" className="object-cover" style={{ objectPosition: position }} />;
}

function Metric({ label, value }: { label: string; value: number }) {
  return <div className="rounded-2xl border border-border bg-card px-4 py-3"><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{label}</p><p className="mt-1 font-mono text-2xl font-semibold tabular-nums">{value.toLocaleString()}</p></div>;
}

export function ImageReviewDashboard() {
  const router = useRouter();
  const [dashboard, setDashboard] = useState<ImageFactoryDashboard | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [batchMode, setBatchMode] = useState<BatchMode>("missing");
  const [provider, setProvider] = useState<Provider>("gemini");
  const [category, setCategory] = useState(categories[0]);
  const [difficulty, setDifficulty] = useState(difficulties[0]);
  const [editing, setEditing] = useState<ImageFactoryReviewItem | null>(null);

  const load = useCallback(async (nextCursor: string | null = null) => {
    setBusy("loading");
    setMessage(null);
    try {
      const query = new URLSearchParams({ limit: "12" });
      if (nextCursor) query.set("cursor", nextCursor);
      const response = await fetch(`/api/internal/image-factory?${query}`);
      if (!response.ok) throw new Error("LOAD_FAILED");
      const data = await response.json() as ImageFactoryDashboard;
      setDashboard(data);
      setCursor(nextCursor);
    } catch {
      setMessage("Image Factory data is unavailable. Check the Convex and operator configuration.");
    } finally {
      setBusy(null);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function command(body: Record<string, unknown>, success: string) {
    setBusy(String(body.command));
    setMessage(null);
    try {
      const response = await fetch("/api/internal/image-factory", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await response.json().catch(() => null) as { error?: unknown } | null;
      if (!response.ok) throw new Error(typeof result?.error === "string" ? result.error : "COMMAND_FAILED");
      setMessage(success);
      await load(cursor);
    } catch (error) {
      const genericError = "Image Factory command could not be completed.";
      const rawError = error instanceof Error ? error.message : "";
      const detail = rawError && rawError !== "COMMAND_FAILED" && rawError !== genericError ? ` ${rawError}` : "";
      setMessage(`${genericError}${detail}`);
    } finally {
      setBusy(null);
    }
  }

  async function signOut() {
    setBusy("logout");
    setMessage(null);
    try {
      const response = await fetch("/api/internal/image-factory/session", {
        method: "DELETE",
        credentials: "same-origin",
      });
      if (!response.ok) throw new Error("LOGOUT_FAILED");
      router.refresh();
    } catch {
      setMessage("Image Factory sign out could not be completed.");
      setBusy(null);
    }
  }

  const batchCommand = useMemo(() => {
    if (batchMode === "category") return { command: "startBatch", filterMode: "category", category, provider, candidateCount: 3 };
    if (batchMode === "difficulty") return { command: "startBatch", filterMode: "difficulty", difficulty, provider, candidateCount: 3 };
    return { command: "startBatch", filterMode: batchMode, provider, candidateCount: 3 };
  }, [batchMode, category, difficulty, provider]);

  if (!dashboard && busy === "loading") {
    return <div className="grid min-h-[70dvh] place-items-center"><LoaderCircle className="size-7 animate-spin" aria-label="Loading Image Factory" /></div>;
  }

  return (
    <section className="safe-top mx-auto max-w-[92rem] px-4 pb-28 sm:px-6 lg:px-10">
      <header className="border-b border-border py-7 sm:flex sm:items-end sm:justify-between sm:gap-8">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">RoadIQ internal operator tool</p>
          <h1 className="mt-2 text-4xl font-semibold tracking-[-0.06em] sm:text-5xl">Image Factory</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">Generate three candidates, inspect visual QA, then approve and publish one asset. Publishing updates Convex content without a Next.js redeploy.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => void load(cursor)} disabled={busy !== null}><RefreshCw className="size-4" aria-hidden="true" />Refresh</Button>
          <Button variant="ghost" onClick={() => void signOut()} disabled={busy !== null}><LogOut className="size-4" aria-hidden="true" />Sign out</Button>
        </div>
      </header>

      {dashboard && <>
        <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
          <Metric label="Challenges" value={dashboard.metrics.totalChallenges} />
          <Metric label="Missing" value={dashboard.metrics.missing + dashboard.metrics.legacy} />
          <Metric label="Generating" value={dashboard.metrics.generating} />
          <Metric label="QA pass" value={dashboard.metrics.qaPass} />
          <Metric label="QA warning" value={dashboard.metrics.qaWarning} />
          <Metric label="QA fail" value={dashboard.metrics.qaFail} />
          <Metric label="Approved" value={dashboard.metrics.approved} />
          <Metric label="Published" value={dashboard.metrics.published} />
        </div>

        <div className="mt-6 grid gap-4 rounded-[1.35rem] border border-border bg-card p-4 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="grid gap-1.5 text-xs font-semibold">Batch scope
              <select value={batchMode} onChange={(event) => setBatchMode(event.target.value as BatchMode)} className="min-h-11 rounded-xl border border-border bg-background px-3 text-sm font-normal">
                <option value="missing">All missing imagery</option>
                <option value="failed_qa">Failed QA only</option>
                <option value="unapproved">Unapproved work</option>
                <option value="category">One category</option>
                <option value="difficulty">One difficulty</option>
              </select>
            </label>
            {batchMode === "category" ? <label className="grid gap-1.5 text-xs font-semibold">Category<select value={category} onChange={(event) => setCategory(event.target.value)} className="min-h-11 rounded-xl border border-border bg-background px-3 text-sm font-normal">{categories.map((value) => <option key={value}>{value}</option>)}</select></label> : batchMode === "difficulty" ? <label className="grid gap-1.5 text-xs font-semibold">Difficulty<select value={difficulty} onChange={(event) => setDifficulty(event.target.value)} className="min-h-11 rounded-xl border border-border bg-background px-3 text-sm font-normal">{difficulties.map((value) => <option key={value}>{value}</option>)}</select></label> : <div className="hidden sm:block" />}
            <label className="grid gap-1.5 text-xs font-semibold">Provider<select value={provider} onChange={(event) => setProvider(event.target.value as Provider)} className="min-h-11 rounded-xl border border-border bg-background px-3 text-sm font-normal"><option value="gemini">Gemini (production)</option>{showMockProvider && <option value="mock">Mock workflow proof (local only)</option>}</select></label>
          </div>
          <div>
            <Button onClick={() => void command(batchCommand, "Batch queued. It will remain in review until a human approves a candidate.")} disabled={busy !== null}><ImagePlus className="size-4" aria-hidden="true" />Queue 3 candidates each</Button>
            <p className="mt-2 text-[11px] text-muted-foreground">Gemini runs server-side with structured visual QA. Mock output is available only in local development and is never auto-published.</p>
          </div>
        </div>

        {message && <p aria-live="polite" className="mt-4 rounded-xl border border-border bg-secondary px-4 py-3 text-sm text-muted-foreground">{message}</p>}

        <div className="mt-7 grid gap-5 xl:grid-cols-2">
          {dashboard.page.map((item) => <ReviewCard key={item.id} item={item} provider={provider} busy={busy !== null} onCommand={command} onEdit={setEditing} />)}
        </div>
        {dashboard.page.length === 0 && <div className="mt-8 rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">Seed challenges into Convex to begin the Image Factory workflow.</div>}
        {!dashboard.isDone && <div className="mt-8 flex justify-center"><Button variant="outline" onClick={() => void load(dashboard.continueCursor)} disabled={busy !== null}>Load more <ChevronRight className="size-4" aria-hidden="true" /></Button></div>}
      </>}

      <EditSpecDialog item={editing} onClose={() => setEditing(null)} onSave={async (body) => { await command(body, "Visual specification saved. Regenerate this challenge when you are ready."); setEditing(null); }} />
    </section>
  );
}

function ReviewCard({ item, provider, busy, onCommand, onEdit }: {
  item: ImageFactoryReviewItem;
  provider: Provider;
  busy: boolean;
  onCommand: (body: Record<string, unknown>, success: string) => Promise<void>;
  onEdit: (item: ImageFactoryReviewItem) => void;
}) {
  const correct = item.correctAnswerId ? item.answers.find((answer) => answer.id === item.correctAnswerId)?.text : null;
  return <article className="overflow-hidden rounded-[1.45rem] border border-border bg-card shadow-[0_18px_50px_rgba(0,0,0,.06)]">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
      <div><p className="font-mono text-[11px] text-muted-foreground">{item.id}</p><h2 className="mt-1 text-lg font-semibold tracking-[-0.03em]">{item.question}</h2></div>
      <StatusPill value={item.imageWorkflowStatus} />
    </div>
    <div className="grid gap-5 p-5 lg:grid-cols-[minmax(13rem,.72fr)_minmax(0,1.28fr)]">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Live card crop</p>
        <div className="relative mt-2 aspect-[4/5] overflow-hidden rounded-2xl bg-secondary"><FactoryImage src={item.currentImage?.imageUrl ?? ""} alt={item.currentImage?.imageAlt ?? item.imageAlt} position={item.currentImage?.imagePosition ?? item.imagePosition} /></div>
        <p className="mt-2 text-xs text-muted-foreground">{item.category} · {item.difficulty} · {item.challengeType}</p>
        <div className="mt-4 flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={() => onEdit(item)} disabled={busy}><SlidersHorizontal className="size-3.5" aria-hidden="true" />Edit spec</Button><Button size="sm" variant="outline" onClick={() => void onCommand({ command: "startBatch", filterMode: "selected", challengeStableIds: [item.id], provider, candidateCount: 3 }, `Regeneration batch queued with the ${provider} provider.`)} disabled={busy}><RefreshCw className="size-3.5" aria-hidden="true" />Regenerate</Button></div>
      </div>
      <div className="min-w-0">
        <div className="rounded-xl border border-border bg-background p-3 text-sm"><p className="font-semibold">Answer choices</p><ul className="mt-2 space-y-1 text-muted-foreground">{item.answers.map((answer) => <li key={answer.id} className={answer.id === item.correctAnswerId ? "font-semibold text-success" : ""}>{answer.text}{answer.id === item.correctAnswerId ? " · correct" : ""}</li>)}</ul>{!correct && <p className="mt-2 text-xs text-muted-foreground">Community question: no answer key.</p>}</div>
        {item.spec && <div className="mt-3 rounded-xl border border-border bg-background p-3"><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Critical visual facts</p><ul className="mt-2 list-disc space-y-1 pl-4 text-xs leading-5 text-muted-foreground">{item.spec.criticalFacts.map((fact) => <li key={fact}>{fact}</li>)}</ul></div>}
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {item.candidates.map((candidate) => <div key={candidate.id} className="overflow-hidden rounded-xl border border-border bg-background"><div className="relative aspect-[4/5] bg-secondary"><FactoryImage src={candidate.imageUrl} alt={`Candidate ${candidate.candidateIndex + 1} for ${item.id}`} position={item.imagePosition} /></div><div className="space-y-2 p-3"><div className="flex items-center justify-between gap-2"><span className="font-mono text-[10px] text-muted-foreground">v{candidate.promptVersion} · #{candidate.candidateIndex + 1}</span><StatusPill value={candidate.qaStatus} /></div>{candidate.qa && <p className="text-xs leading-5 text-muted-foreground">{candidate.qa.score}/100 · {candidate.qa.summary}</p>}<div className="flex flex-wrap gap-1.5"><Button size="sm" variant="outline" onClick={() => void onCommand({ command: "approveCandidate", candidateId: candidate.id }, "Candidate approved. Publish when you are ready.")} disabled={busy || candidate.qaStatus === "pending" || candidate.approvalStatus === "approved"}><Check className="size-3.5" aria-hidden="true" />Approve</Button><Button size="sm" variant="ghost" onClick={() => void onCommand({ command: "rejectCandidate", candidateId: candidate.id }, "Candidate rejected.")} disabled={busy || candidate.approvalStatus === "rejected"}><X className="size-3.5" aria-hidden="true" />Reject</Button>{candidate.approvalStatus === "approved" && <Button size="sm" onClick={() => void onCommand({ command: "publishCandidate", candidateId: candidate.id }, "Candidate published. RoadIQ now reads the active Convex asset.")} disabled={busy}><Upload className="size-3.5" aria-hidden="true" />Publish</Button>}</div></div></div>)}
        </div>
        {item.assets.length > 1 && <div className="mt-4 border-t border-border pt-4"><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Asset history</p><div className="mt-2 flex flex-wrap gap-2">{item.assets.map((asset) => <Button key={asset.id} size="sm" variant={asset.isActive ? "secondary" : "outline"} onClick={() => void onCommand({ command: "rollbackAsset", challengeId: item.id, assetId: asset.id }, `Version ${asset.version} is now active.`)} disabled={busy || asset.isActive}><RotateCcw className="size-3.5" aria-hidden="true" />v{asset.version}{asset.isActive ? " active" : ""}</Button>)}</div></div>}
      </div>
    </div>
  </article>;
}

function EditSpecDialog({ item, onClose, onSave }: { item: ImageFactoryReviewItem | null; onClose: () => void; onSave: (body: Record<string, unknown>) => Promise<void> }) {
  return <Dialog open={Boolean(item)} onOpenChange={(open) => { if (!open) onClose(); }}><DialogContent className="max-w-2xl"><DialogTitle>Edit visual specification</DialogTitle><DialogDescription>Changes are versioned in Convex. Save the brief, then regenerate this one challenge to create a new candidate set.</DialogDescription>{item && <EditSpecForm key={`${item.id}:${item.spec?.promptVersion ?? 0}`} item={item} onSave={onSave} />}</DialogContent></Dialog>;
}

function EditSpecForm({ item, onSave }: { item: ImageFactoryReviewItem; onSave: (body: Record<string, unknown>) => Promise<void> }) {
  const [prompt, setPrompt] = useState(item.spec?.prompt ?? "");
  const [negativePrompt, setNegativePrompt] = useState(item.spec?.negativePrompt ?? "");
  const [criticalFacts, setCriticalFacts] = useState(item.spec?.criticalFacts.join("\n") ?? "");
  const [imagePosition, setImagePosition] = useState(item.imagePosition);
  const [imageAlt, setImageAlt] = useState(item.imageAlt);
  return <form className="mt-5 grid gap-4" onSubmit={(event) => { event.preventDefault(); void onSave({ command: "updateSpec", challengeId: item.id, prompt, negativePrompt, criticalFacts: criticalFacts.split("\n").map((value) => value.trim()).filter(Boolean), imagePosition, imageAlt }); }}><label className="grid gap-1.5 text-sm font-semibold">Prompt<textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} className="min-h-28 rounded-xl border border-border bg-background p-3 text-sm font-normal outline-none focus-visible:ring-2 focus-visible:ring-ring" required /></label><label className="grid gap-1.5 text-sm font-semibold">Negative prompt<textarea value={negativePrompt} onChange={(event) => setNegativePrompt(event.target.value)} className="min-h-20 rounded-xl border border-border bg-background p-3 text-sm font-normal outline-none focus-visible:ring-2 focus-visible:ring-ring" required /></label><label className="grid gap-1.5 text-sm font-semibold">Critical facts (one per line)<textarea value={criticalFacts} onChange={(event) => setCriticalFacts(event.target.value)} className="min-h-24 rounded-xl border border-border bg-background p-3 text-sm font-normal outline-none focus-visible:ring-2 focus-visible:ring-ring" required /></label><div className="grid gap-4 sm:grid-cols-2"><label className="grid gap-1.5 text-sm font-semibold">Card crop position<input value={imagePosition} onChange={(event) => setImagePosition(event.target.value)} className="min-h-11 rounded-xl border border-border bg-background px-3 text-sm font-normal outline-none focus-visible:ring-2 focus-visible:ring-ring" required /></label><label className="grid gap-1.5 text-sm font-semibold">Image alt text<input value={imageAlt} onChange={(event) => setImageAlt(event.target.value)} className="min-h-11 rounded-xl border border-border bg-background px-3 text-sm font-normal outline-none focus-visible:ring-2 focus-visible:ring-ring" required /></label></div><Button type="submit">Save visual specification</Button></form>;
}
