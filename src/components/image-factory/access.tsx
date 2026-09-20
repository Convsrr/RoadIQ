"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function ImageFactoryAccess() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/internal/image-factory/session", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token }),
      });
      if (!response.ok) throw new Error("ACCESS_DENIED");
      setToken("");
      router.refresh();
    } catch {
      setError("Access token was not accepted.");
      setBusy(false);
    }
  }

  return (
    <section className="safe-top mx-auto flex min-h-[78dvh] max-w-md items-center px-5 py-12">
      <form onSubmit={submit} className="w-full rounded-[1.4rem] border border-border bg-card p-6 shadow-[0_24px_70px_rgba(0,0,0,.08)]">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">RoadIQ internal</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-[-0.05em]">Image Factory</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">Use the operator token configured for this RoadIQ environment. Image generation and publishing are never available to normal players.</p>
        <label className="mt-6 block text-sm font-semibold" htmlFor="image-factory-token">Operator token</label>
        <input
          id="image-factory-token"
          type="password"
          value={token}
          onChange={(event) => setToken(event.target.value)}
          autoComplete="current-password"
          className="mt-2 min-h-12 w-full rounded-xl border border-border bg-background px-4 font-mono text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          required
        />
        {error && <p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}
        <Button className="mt-6 w-full" type="submit" disabled={busy}>{busy ? "Checking access…" : "Open Image Factory"}</Button>
      </form>
    </section>
  );
}
