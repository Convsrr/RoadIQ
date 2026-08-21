import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return <section className="grid min-h-[75dvh] place-items-center px-6 text-center"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">404</p><h1 className="mt-3 text-4xl font-bold tracking-[-0.05em]">That challenge has moved.</h1><p className="mx-auto mt-3 max-w-sm leading-7 text-muted-foreground">Return to the feed for another call.</p><Button asChild className="mt-7"><Link href="/">Open the feed</Link></Button></div></section>;
}
