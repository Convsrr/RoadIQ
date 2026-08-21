import Link from "next/link";
import { CloudOff, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RoadIQLogo } from "@/components/roadiq/logo";

export default function OfflinePage() {
  return <section className="safe-top mx-auto flex min-h-[80dvh] max-w-md flex-col items-center justify-center px-6 text-center"><RoadIQLogo /><div className="mt-10 grid size-20 place-items-center rounded-full bg-secondary"><CloudOff className="size-8 text-muted-foreground" /></div><h1 className="mt-6 text-3xl font-bold tracking-[-0.04em]">You are offline</h1><p className="mt-3 leading-7 text-muted-foreground">RoadIQ needs a connection to load challenges and validate new answers. Your saved progress is safe on this device.</p><Button asChild className="mt-7"><Link href="/"><RotateCcw className="size-4" />Try again</Link></Button></section>;
}
