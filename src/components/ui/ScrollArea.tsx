import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

/** Thin-scrollbar styling is applied globally in themes/globals.css. */
export function ScrollArea({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("overflow-auto", className)} {...props} />;
}