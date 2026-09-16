import Link from "next/link";
import { PageHeader } from "@/components/roadiq/page-header";

export function EditorialPage({ title, eyebrow, children }: { title: string; eyebrow: string; children: React.ReactNode }) {
  return (
    <div>
      <PageHeader title={title} eyebrow={eyebrow} />
      <article className="mx-auto max-w-6xl px-5 pb-28 text-[15px] leading-7 text-muted-foreground"><div className="max-w-2xl space-y-8 rounded-[1.35rem] border border-border bg-card p-6 sm:p-9">
        {children}
        <footer className="flex flex-wrap gap-5 border-t border-border pt-6 text-sm">
          <Link href="/about" className="text-foreground hover:text-primary">About</Link>
          <Link href="/privacy" className="text-foreground hover:text-primary">Privacy</Link>
          <Link href="/terms" className="text-foreground hover:text-primary">Terms</Link>
        </footer>
      </div></article>
    </div>
  );
}
