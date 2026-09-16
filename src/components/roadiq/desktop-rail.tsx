import Link from "next/link";
import { CalendarDays, Gauge, Home, Trophy } from "lucide-react";
import { RoadIQLogo } from "@/components/roadiq/logo";

const links = [
  { href: "/", label: "Home", icon: Home },
  { href: "/daily", label: "Daily", icon: CalendarDays },
  { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
  { href: "/profile", label: "Profile", icon: Gauge },
];

export function DesktopRail() {
  return (
    <header className="desktop-header sticky top-0 z-40 hidden border-b border-border/70 bg-background/88 backdrop-blur-xl lg:block">
      <div className="mx-auto flex h-[4.5rem] max-w-[90rem] items-center gap-8 px-8 xl:px-12">
        <Link href="/" className="shrink-0 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <RoadIQLogo />
        </Link>
        <nav className="mx-auto flex items-center gap-1" aria-label="Desktop navigation">
        {links.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} className="flex min-h-10 items-center gap-2 rounded-full px-4 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <Icon className="size-4" aria-hidden="true" />
            {label}
          </Link>
        ))}
        </nav>
        <Link href="/about" className="flex min-h-10 shrink-0 items-center rounded-full bg-primary px-5 text-[13px] font-semibold text-primary-foreground transition-transform hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
          How it works
        </Link>
      </div>
    </header>
  );
}
