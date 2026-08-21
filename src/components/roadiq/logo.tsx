import { cn } from "@/lib/utils";

export function RoadIQLogo({ compact = false, className }: { compact?: boolean; className?: string }) {
  return (
    <div className={cn("inline-flex items-center gap-2.5", className)} aria-label="RoadIQ">
      <span className="grid size-8 place-items-center rounded-[10px] bg-primary text-[11px] font-black tracking-[-0.08em] text-primary-foreground shadow-[inset_0_1px_0_rgba(255,255,255,.24)]">
        RQ
      </span>
      {!compact && <span className="text-[17px] font-bold tracking-[-0.04em]">RoadIQ</span>}
    </div>
  );
}
