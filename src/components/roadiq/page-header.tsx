import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { RoadIQLogo } from "@/components/roadiq/logo";

export function PageHeader({ eyebrow, title, description }: { eyebrow?: string; title: string; description?: string }) {
  return (
    <header className="safe-top mx-auto max-w-6xl px-5 pb-10 pt-2 lg:pb-12 lg:pt-14">
      <div className="flex min-h-11 items-center justify-between gap-4">
        <Link href="/" className="flex size-11 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:hidden" aria-label="Back to Home">
          <ArrowLeft className="size-5" aria-hidden="true" />
        </Link>
        <RoadIQLogo className="lg:hidden" />
        <div className="size-11 lg:hidden" />
      </div>
      <div className="mt-6 max-w-3xl lg:mt-0">
        {eyebrow && <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{eyebrow}</p>}
        <h1 className="text-display mt-3 text-[clamp(3rem,9vw,6.8rem)] font-semibold">{title}</h1>
        {description && <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">{description}</p>}
      </div>
    </header>
  );
}
