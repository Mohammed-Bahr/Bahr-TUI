import { useCallback, useRef } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { useThemeSync } from "@/hooks/useThemeSync";
import { useUIStore } from "@/stores";
import { cn } from "@/lib/cn";
import { mockWorkspace } from "@/mock/workspace.mock";
import { WindowControls } from "@/components/layout/WindowControls";

/**
 * Phase 1 shell: structural regions only. Phase 2 will decompose this into
 * components/layout/{Header,ActivityBar,Sidebar,StatusBar}.tsx and wire in
 * the tab/pane system in place of the placeholder panels below.
 */
export function AppShell() {
  useThemeSync();

  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  const sidebarWidth = useUIStore((s) => s.sidebarWidth);
  const setSidebarWidth = useUIStore((s) => s.setSidebarWidth);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);

  const draggingRef = useRef(false);

  const onResizeStart = useCallback(
    (e: ReactPointerEvent) => {
      e.preventDefault();
      draggingRef.current = true;
      const startX = e.clientX;
      const startWidth = sidebarWidth;

      const onMove = (ev: PointerEvent) => {
        if (!draggingRef.current) return;
        setSidebarWidth(startWidth + (ev.clientX - startX));
      };
      const onUp = () => {
        draggingRef.current = false;
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
      };

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    },
    [sidebarWidth, setSidebarWidth],
  );

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-surface-0 text-ink-primary">
      {/* Header / custom title bar (decorations: false in tauri.conf.json) */}
      <header
        data-tauri-drag-region
        className="flex h-9 shrink-0 select-none items-center justify-between border-b border-border bg-surface-1 pl-3 text-xs text-ink-secondary"
      >
        <div data-tauri-drag-region className="flex min-w-0 items-center gap-2">
          <span className="font-medium text-ink-primary">{mockWorkspace.name}</span>
          <span className="text-ink-muted">/</span>
          <span className="truncate">{mockWorkspace.rootPath}</span>
        </div>
        <WindowControls />
      </header>

      <div className="flex min-h-0 flex-1">
        {/* Activity bar */}
        <nav className="flex w-11 shrink-0 flex-col items-center gap-1 border-r border-border bg-surface-1 py-2">
          <button
            onClick={toggleSidebar}
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-md text-ink-secondary",
              "hover:bg-surface-hover hover:text-ink-primary",
              sidebarOpen && "bg-surface-hover text-ink-primary",
            )}
            title="Toggle sidebar"
          >
            <span className="text-base leading-none">▤</span>
          </button>
        </nav>

        {/* Sidebar */}
        {sidebarOpen && (
          <div
            className="relative flex shrink-0 flex-col border-r border-border bg-surface-1"
            style={{ width: sidebarWidth }}
          >
            <div className="flex h-9 items-center border-b border-border px-3 text-xs font-medium uppercase tracking-wide text-ink-secondary">
              Explorer
            </div>
            <div className="flex-1 overflow-auto p-3 text-sm text-ink-muted">
              File explorer will render here.
            </div>

            <div
              onPointerDown={onResizeStart}
              className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-accent/40 active:bg-accent/60"
            />
          </div>
        )}

        {/* Main workspace */}
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex h-9 shrink-0 items-center border-b border-border bg-surface-1 px-2 text-xs text-ink-secondary">
            No tabs open
          </div>
          <div className="flex flex-1 items-center justify-center text-sm text-ink-muted">
            Main workspace
          </div>
        </div>
      </div>

      {/* Status bar */}
      <footer className="flex h-6 shrink-0 items-center justify-between border-t border-border bg-surface-1 px-3 text-[11px] text-ink-secondary">
        <span>Ready</span>
        <span className="text-ink-muted">tui</span>
      </footer>
    </div>
  );
}