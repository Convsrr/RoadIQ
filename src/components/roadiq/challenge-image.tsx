"use client";

import Image from "next/image";
import { ImageOff } from "lucide-react";
import { useState } from "react";
import type { PublicChallenge } from "@/lib/domain/types";

export function ChallengeImage({ challenge, priority = false }: { challenge: PublicChallenge; priority?: boolean }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className="challenge-vignette relative h-[43dvh] min-h-[18rem] max-h-[32rem] overflow-hidden rounded-[1.4rem] bg-secondary shadow-[0_28px_80px_rgba(0,0,0,.16)] lg:sticky lg:top-[6.5rem] lg:h-[calc(100dvh-8rem)] lg:max-h-[44rem] lg:min-h-[34rem]">
      <div className="absolute inset-0 overflow-hidden bg-[radial-gradient(circle_at_50%_22%,#343438,#171719_68%)]" aria-hidden="true">
        <div className="absolute left-1/2 top-[-12%] h-[130%] w-32 -translate-x-1/2 rotate-[18deg] border-x border-white/8 bg-black/10" />
        <div className="absolute left-1/2 top-8 h-20 -translate-x-1/2 border-l-2 border-dashed border-white/14" />
        <div className="absolute bottom-8 left-1/2 h-20 -translate-x-1/2 border-l-2 border-dashed border-white/14" />
      </div>
      {!failed ? (
        <Image
          src={challenge.imageUrl}
          alt={challenge.imageAlt}
          fill
          priority={priority}
          sizes="(max-width: 640px) 100vw, 560px"
          className="object-cover transition-transform duration-700 motion-reduce:transition-none"
          style={{ objectPosition: challenge.imagePosition }}
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="absolute inset-0 grid place-items-center text-center text-white/65">
          <div className="space-y-3">
            <ImageOff className="mx-auto size-8" aria-hidden="true" />
            <p className="text-sm">Image unavailable</p>
          </div>
        </div>
      )}
      <div className="absolute inset-x-4 top-4 z-10 flex items-center justify-between gap-3">
        <span className="rounded-full bg-black/68 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white backdrop-blur-md">
          {challenge.category}
        </span>
        <span className="rounded-full bg-white/88 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-black backdrop-blur-md">
          {challenge.difficulty}
        </span>
      </div>
    </div>
  );
}
