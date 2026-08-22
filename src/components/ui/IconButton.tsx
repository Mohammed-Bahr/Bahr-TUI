import { forwardRef } from "react";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
  size?: "sm" | "md";
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, active, size = "md", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center rounded-md text-ink-secondary transition-colors",
          "hover:bg-surface-hover hover:text-ink-primary",
          "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent",
          "disabled:opacity-40 disabled:pointer-events-none",
          size === "sm" ? "h-6 w-6" : "h-7 w-7",
          active && "bg-surface-hover text-ink-primary",
          className,
        )}
        {...props}
      />
    );
  },
);

IconButton.displayName = "IconButton";
