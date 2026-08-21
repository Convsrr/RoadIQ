import Link from "next/link";
import { CalendarDays, Gauge, Home, Info, Trophy } from "lucide-react";
import { RoadIQLogo } from "@/components/roadiq/logo";

const links = [
  { href: "/", label: "Home", icon: Home },
  { href: "/daily", label: "Daily", icon: CalendarDays },
  { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
  { href: "/profile", label: "Profile", icon: Gauge },
];

export function DesktopRail() {
  return (
    <aside className="fixed left-6 top-6 z-30 hidden h-[calc(100dvh-3rem)] w-52 flex-col rounded-[1.75rem] border border-border/70 bg-card/55 p-4 backdrop-blur-xl xl:flex">
      <RoadIQLogo className="px-2 py-2" />
      <nav className="mt-8 space-y-1" aria-label="Desktop navigation">
        {links.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <Icon className="size-[18px]" aria-hidden="true" />
            {label}
          </Link>
        ))}
      </nav>
      <div className="mt-auto border-t border-border/70 pt-4">
        <Link href="/about" className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm text-muted-foreground hover:text-foreground">
          <Info className="size-[18px]" aria-hidden="true" />
          About RoadIQ
        </Link>
      </div>
    </aside>
  );
}
