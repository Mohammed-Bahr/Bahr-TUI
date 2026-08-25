import React from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { ThemeSettings } from "@/components/ThemeSettings";
import { useTuiTheme } from "@/themes/ThemeContext";
import { hexToCssRgb } from "@/lib/color";

interface ButtonsBarProps {
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  terminalOpen: boolean;
  onToggleTerminal: () => void;
  /** Rendered in place of the app title — used for the focused pane's tabs. */
  children?: React.ReactNode;
}

const ButtonsBar: React.FC<ButtonsBarProps> = ({
  sidebarOpen,
  onToggleSidebar,
  terminalOpen,
  onToggleTerminal,
  children,
}) => {
  const appWindow = getCurrentWindow();
  const { theme } = useTuiTheme();
  const ui = theme.ui;

  const handleMinimize = () => {
    void appWindow.minimize();
  };

  const handleToggleMaximize = () => {
    void appWindow.toggleMaximize();
  };

  const handleClose = () => {
    void appWindow.close();
  };

  return (
    <header
      data-tauri-drag-region
      className="relative z-50 flex h-12 shrink-0 items-center justify-between border-b px-4 shadow-lg select-none"
      style={{
        borderColor: hexToCssRgb(ui.text, 0.1),
        background: ui.background,
      }}
    >
      <div
        className="flex min-w-0 flex-1 items-stretch gap-2 self-stretch text-sm font-medium"
        style={{ color: ui.text }}
      >
        <span
          data-tauri-drag-region
          className="flex shrink-0 items-center gap-2 self-stretch px-1"
        >
          <span
            className="h-2 w-2 rounded-full"
            style={{
              background: ui.accent,
              boxShadow: `0 0 10px ${ui.accent}`,
            }}
          />
          TUI
        </span>
        {children}
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label="Toggle sidebar"
          title="Toggle sidebar"
          onClick={onToggleSidebar}
          className="flex h-7 w-7 items-center justify-center rounded-full transition-colors"
          style={{
            background: sidebarOpen ? ui.accentSoft : hexToCssRgb(ui.text, 0.08),
            color: sidebarOpen ? ui.accent : ui.text,
          }}
        >
          <svg
            viewBox="0 0 24 24"
            className="h-3.5 w-3.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="4" width="18" height="16" rx="2" />
            <path d="M9 4v16" />
          </svg>
        </button>

        <button
          type="button"
          aria-label="Toggle terminal panel"
          title="Toggle terminal panel"
          onClick={onToggleTerminal}
          className="flex h-7 w-7 items-center justify-center rounded-full transition-colors"
          style={{
            background: terminalOpen
              ? ui.accentSoft
              : hexToCssRgb(ui.text, 0.08),
            color: terminalOpen ? ui.accent : ui.text,
          }}
        >
          <svg
            viewBox="0 0 24 24"
            className="h-3.5 w-3.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="4" width="18" height="16" rx="2" />
            <path d="M7 9l3 3-3 3M12 15h5" />
          </svg>
        </button>

        <ThemeSettings />

        <button
          type="button"
          aria-label="Minimize app"
          onClick={handleMinimize}
          className="flex h-7 w-7 items-center justify-center rounded-full transition hover:bg-white/15"
          style={{
            background: hexToCssRgb(ui.text, 0.08),
            color: ui.text,
          }}
        >
          <svg
            viewBox="0 0 24 24"
            className="h-3.5 w-3.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          >
            <path d="M5 12h14" />
          </svg>
        </button>

        <button
          type="button"
          aria-label="Maximize app"
          onClick={handleToggleMaximize}
          className="flex h-7 w-7 items-center justify-center rounded-full transition hover:bg-white/15"
          style={{
            background: hexToCssRgb(ui.text, 0.08),
            color: ui.text,
          }}
        >
          <svg
            viewBox="0 0 24 24"
            className="h-3.5 w-3.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="5" y="5" width="14" height="14" rx="1.5" />
          </svg>
        </button>

        <button
          type="button"
          aria-label="Close app"
          onClick={handleClose}
          className="flex h-7 w-7 items-center justify-center rounded-full transition hover:bg-red-500/80 hover:text-white"
          style={{
            background: hexToCssRgb(ui.text, 0.08),
            color: ui.text,
          }}
        >
          <svg
            viewBox="0 0 24 24"
            className="h-3.5 w-3.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          >
            <path d="M6 6l12 12M6 18L18 6" />
          </svg>
        </button>
      </div>
    </header>
  );
};

export default ButtonsBar;
