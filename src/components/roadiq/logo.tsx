import { cn } from "@/lib/utils";

export function RoadIQLogo({ compact = false, className }: { compact?: boolean; className?: string }) {
  return (
    <div className={cn("inline-flex items-center gap-2.5", className)} role="img" aria-label="RoadIQ">
      <span className="relative grid size-8 place-items-center rounded-full bg-primary text-primary-foreground">
        <span className="size-3.5 rounded-full border-[3px] border-current" aria-hidden="true" />
        <span className="absolute bottom-[5px] h-1.5 w-[3px] rounded-full bg-current" aria-hidden="true" />
      </span>
      {!compact && <span className="text-[17px] font-semibold tracking-[-0.045em]">RoadIQ</span>}
    </div>
  );
}
