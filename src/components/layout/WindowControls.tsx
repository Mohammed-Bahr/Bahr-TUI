import { Minus, Square, X } from "lucide-react";
import { windowService } from "@/services/tauri/window";
import { cn } from "@/lib/cn";

export function WindowControls() {
  return (
    <div className="flex h-full items-center">
      <button
        onClick={() => windowService.minimize()}
        className="flex h-full w-10 items-center justify-center text-ink-secondary hover:bg-surface-hover hover:text-ink-primary"
        aria-label="Minimize"
      >
        <Minus size={14} />
      </button>
      <button
        onClick={() => windowService.toggleMaximize()}
        className="flex h-full w-10 items-center justify-center text-ink-secondary hover:bg-surface-hover hover:text-ink-primary"
        aria-label="Maximize"
      >
        <Square size={11} />
      </button>
      <button
        onClick={() => windowService.close()}
        className={cn(
          "flex h-full w-10 items-center justify-center text-ink-secondary",
          "hover:bg-danger hover:text-white",
        )}
        aria-label="Close"
      >
        <X size={14} />
      </button>
    </div>
  );
}