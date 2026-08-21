"use client";

import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <section className="grid min-h-[75dvh] place-items-center px-6 text-center"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">RoadIQ paused</p><h1 className="mt-3 text-3xl font-bold tracking-tight">This screen did not load.</h1><p className="mx-auto mt-3 max-w-sm leading-7 text-muted-foreground">Your saved answers remain on this device. Retry the screen when you are ready.</p><Button className="mt-7" onClick={reset}><RotateCcw className="size-4" />Retry</Button></div></section>;
}
