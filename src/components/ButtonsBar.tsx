import React from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";

const ButtonsBar: React.FC = () => {
  const appWindow = getCurrentWindow();

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
      className="fixed inset-x-0 top-0 z-50 flex h-12 items-center justify-between border-b border-white/10 bg-slate-900/75 px-4 shadow-lg backdrop-blur-md select-none"
    >
      <div className="flex flex-1 items-center text-sm font-medium text-slate-200">
        My App
      </div>
      
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label="Minimize app"
          onClick={handleMinimize}
          className="pointer-events-auto flex h-7 w-7 items-center justify-center rounded-full bg-white/8 text-slate-200 transition hover:bg-white/15"
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
          className="pointer-events-auto flex h-7 w-7 items-center justify-center rounded-full bg-white/8 text-slate-200 transition hover:bg-white/15"
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
          className="pointer-events-auto flex h-7 w-7 items-center justify-center rounded-full bg-white/8 text-slate-200 transition hover:bg-red-500/80 hover:text-white"
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
