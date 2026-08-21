import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { RoadIQLogo } from "@/components/roadiq/logo";

export function PageHeader({ eyebrow, title, description }: { eyebrow?: string; title: string; description?: string }) {
  return (
    <header className="safe-top mx-auto max-w-4xl px-5 pb-7 pt-2">
      <div className="flex min-h-11 items-center justify-between gap-4">
        <Link href="/" className="flex size-11 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:hidden" aria-label="Back to Home">
          <ArrowLeft className="size-5" aria-hidden="true" />
        </Link>
        <RoadIQLogo className="lg:hidden" />
        <div className="size-11 lg:hidden" />
      </div>
      <div className="mt-6">
        {eyebrow && <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">{eyebrow}</p>}
        <h1 className="mt-2 text-[clamp(2.4rem,10vw,4.5rem)] font-bold leading-[.95] tracking-[-0.06em]">{title}</h1>
        {description && <p className="mt-4 max-w-xl text-base leading-7 text-muted-foreground">{description}</p>}
      </div>
    </header>
  );
}
