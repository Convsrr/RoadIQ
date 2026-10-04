"use client";

import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { useEffect, useRef } from "react";
import type { PublicChallenge } from "@/lib/domain/types";

const HERO_VIDEO_URL =
  "https://cdn.sceneai.art/Hero%20section%20video%20file%20(2)/37091057-3719-4207-815c-745ebf57aeb4.mp4";

const NAV_ITEMS = [
  { href: "/", label: "Home" },
  { href: "/daily", label: "Daily" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/about", label: "About" },
] as const;

export function Onboarding({ onStart, challenges }: { onStart: (challengeId: string) => void; challenges: PublicChallenge[] }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const firstChallenge = challenges[0];

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const ensurePlayback = () => {
      if (motionPreference.matches) return;
      void video.play().catch(() => undefined);
    };
    const handleMotionPreference = () => {
      if (motionPreference.matches) {
        video.pause();
        return;
      }
      ensurePlayback();
    };
    const handleVisibility = () => {
      if (!document.hidden) ensurePlayback();
    };

    for (const eventName of ["pause", "ended", "loadedmetadata", "canplay"] as const) {
      video.addEventListener(eventName, ensurePlayback);
    }
    document.addEventListener("visibilitychange", handleVisibility);
    motionPreference.addEventListener("change", handleMotionPreference);
    const watchdog = window.setInterval(() => {
      if (video.paused) ensurePlayback();
    }, 1_000);

    handleMotionPreference();

    return () => {
      window.clearInterval(watchdog);
      document.removeEventListener("visibilitychange", handleVisibility);
      motionPreference.removeEventListener("change", handleMotionPreference);
      for (const eventName of ["pause", "ended", "loadedmetadata", "canplay"] as const) {
        video.removeEventListener(eventName, ensurePlayback);
      }
    };
  }, []);

  if (!firstChallenge) return null;

  const startChallenge = () => onStart(firstChallenge.id);

  return (
    <section className="relative isolate h-svh min-h-svh w-full overflow-hidden bg-[#0a0a0b] text-white sm:min-h-[720px]" aria-labelledby="roadiq-hero-title">
      <video
        ref={videoRef}
        className="pointer-events-none absolute inset-0 h-full w-full object-cover object-[center_60%] motion-reduce:[animation:none]"
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        aria-hidden="true"
        tabIndex={-1}
        disablePictureInPicture
      >
        <source src={HERO_VIDEO_URL} type="video/mp4" />
      </video>

      <div
        className="pointer-events-none absolute inset-0 z-[1] bg-[linear-gradient(180deg,rgba(8,8,10,0.62)_0%,rgba(8,8,10,0.18)_30%,rgba(8,8,10,0.28)_55%,rgba(8,8,10,0.94)_100%)]"
        aria-hidden="true"
      />

      <nav className="safe-top absolute inset-x-0 top-0 z-[4] grid grid-cols-[1fr_auto_1fr] items-center px-5 py-4 sm:px-8 sm:py-6 lg:px-14 lg:py-[2.125rem]" aria-label="Welcome navigation">
        <div className="hidden items-center gap-8 justify-self-start lg:flex xl:gap-[2.625rem]">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={item.href === "/" ? "page" : undefined}
              className={`min-h-11 content-center border-b-2 text-sm font-medium transition-colors focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-4 focus-visible:ring-offset-black/70 motion-reduce:transition-none ${
                item.href === "/"
                  ? "border-white text-white"
                  : "border-transparent text-white/80 hover:text-white"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>

        <Link
          href="/"
          className="justify-self-center text-[1.15rem] font-bold tracking-[0.04em] text-white focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-4 focus-visible:ring-offset-black/70 sm:text-[1.625rem]"
          aria-label="RoadIQ home"
        >
          ROADIQ
        </Link>

        <button
          type="button"
          onClick={startChallenge}
          className="group flex min-h-11 items-center justify-center gap-2 justify-self-end rounded-[0.625rem] border border-white/20 bg-white/10 px-3.5 text-xs font-semibold text-[#faf9f5] backdrop-blur-md transition-[background-color,color,border-color] hover:border-white hover:bg-white hover:text-[#0a0a0b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-4 focus-visible:ring-offset-black/70 motion-reduce:transition-none sm:px-5 sm:text-sm"
        >
          Play now
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0" aria-hidden="true" />
        </button>
      </nav>

      <p
        className="pointer-events-none absolute inset-x-0 top-[6.75rem] z-[2] whitespace-nowrap bg-[linear-gradient(180deg,#ffffff_55%,#b8b8bd_100%)] bg-clip-text text-center text-[13.3vw] font-extrabold leading-[0.9] tracking-[-0.045em] text-transparent sm:top-[5.75rem]"
        aria-hidden="true"
      >
        READ THE ROAD
      </p>

      <div className="safe-bottom absolute inset-x-0 bottom-0 z-[3] px-5 pb-7 sm:px-8 sm:pb-10 lg:left-14 lg:right-auto lg:max-w-[42.25rem] lg:px-0 lg:pb-14">
        <p className="mb-3 text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-white/70 sm:mb-4 sm:text-xs">
          Real situations · Split-second decisions
        </p>
        <h1 id="roadiq-hero-title" className="max-w-[11ch] text-balance text-[clamp(2.4rem,8.8vw,4.125rem)] font-semibold leading-[0.98] tracking-[-0.035em] text-white">
          How good a driver are you, really?
        </h1>
        <p className="mt-[1.125rem] max-w-[30rem] text-[0.9375rem] font-normal leading-6 text-white/[.82] sm:text-base">
          Read the road, make the call, and see how your judgement compares with other drivers. No account needed.
        </p>
        <button
          type="button"
          onClick={startChallenge}
          className="group mt-7 flex min-h-12 items-center justify-center gap-3 rounded-[0.625rem] border border-white/25 bg-white/10 px-6 text-sm font-semibold tracking-[0.04em] text-white backdrop-blur-md transition-[background-color,color,border-color] hover:border-white hover:bg-white hover:text-[#0a0a0b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-4 focus-visible:ring-offset-black/70 motion-reduce:transition-none sm:mt-8"
        >
          START CHALLENGE
          <ArrowUpRight className="size-[0.9375rem] transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0 motion-reduce:group-hover:translate-y-0" aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}
