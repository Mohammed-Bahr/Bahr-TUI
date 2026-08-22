import { forwardRef } from "react";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type ButtonVariant = "default" | "primary" | "ghost" | "danger";
type ButtonSize = "sm" | "md";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const variantClasses: Record<ButtonVariant, string> = {
  default: "bg-surface-2 text-ink-primary border border-border hover:bg-surface-hover",
  primary: "bg-accent text-accent-ink hover:brightness-110",
  ghost: "bg-transparent text-ink-secondary hover:bg-surface-hover hover:text-ink-primary",
  danger: "bg-danger text-accent-ink hover:brightness-110",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-7 px-2 text-xs gap-1.5",
  md: "h-8 px-3 text-sm gap-2",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "md", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center rounded-md font-medium transition-colors",
          "disabled:opacity-50 disabled:pointer-events-none",
          "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent",
          variantClasses[variant],
          sizeClasses[size],
          className,
        )}
        {...props}
      />
    );
  },
);

Button.displayName = "Button";