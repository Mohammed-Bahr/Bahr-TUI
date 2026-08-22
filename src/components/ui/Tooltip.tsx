import type { PropsWithChildren } from "react";
import { cn } from "@/lib/cn";

type TooltipSide = "top" | "bottom" | "left" | "right";

interface TooltipProps extends PropsWithChildren {
  label: string;
  side?: TooltipSide;
  className?: string;
}

const sideClasses: Record<TooltipSide, string> = {
  top: "bottom-full left-1/2 -translate-x-1/2 mb-1.5",
  bottom: "top-full left-1/2 -translate-x-1/2 mt-1.5",
  left: "right-full top-1/2 -translate-y-1/2 mr-1.5",
  right: "left-full top-1/2 -translate-y-1/2 ml-1.5",
};

/** Lightweight CSS-only tooltip. No portal, so avoid inside overflow:hidden ancestors. */
export function Tooltip({ label, side = "bottom", className, children }: TooltipProps) {
  return (
    <span className={cn("group relative inline-flex", className)}>
      {children}
      <span
        role="tooltip"
        className={cn(
          "pointer-events-none absolute z-50 whitespace-nowrap rounded-md border border-border-strong",
          "bg-surface-2 px-2 py-1 text-xs text-ink-primary shadow-lg",
          "opacity-0 scale-95 transition-all duration-100 delay-300",
          "group-hover:opacity-100 group-hover:scale-100",
          sideClasses[side],
        )}
      >
        {label}
      </span>
    </span>
  );
}