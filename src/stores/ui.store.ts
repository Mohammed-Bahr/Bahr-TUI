import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AccentColor, ResolvedTheme, ThemeMode } from "@/types/common";

export type ActivityView = "explorer" | "search" | "git" | "agent" | "settings";

interface UIState {
  theme: ThemeMode;
  resolvedTheme: ResolvedTheme;
  accent: AccentColor;

  sidebarOpen: boolean;
  sidebarWidth: number;

  bottomPanelOpen: boolean;
  bottomPanelHeight: number;

  activeView: ActivityView;

  commandPaletteOpen: boolean;

  setTheme: (theme: ThemeMode) => void;
  setResolvedTheme: (resolved: ResolvedTheme) => void;
  setAccent: (accent: AccentColor) => void;

  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setSidebarWidth: (width: number) => void;

  toggleBottomPanel: () => void;
  setBottomPanelOpen: (open: boolean) => void;
  setBottomPanelHeight: (height: number) => void;

  setActiveView: (view: ActivityView) => void;
  setCommandPaletteOpen: (open: boolean) => void;
}

const SIDEBAR_MIN = 200;
const SIDEBAR_MAX = 480;
const BOTTOM_PANEL_MIN = 120;
const BOTTOM_PANEL_MAX = 640;

export const SIDEBAR_CONSTRAINTS = { min: SIDEBAR_MIN, max: SIDEBAR_MAX };
export const BOTTOM_PANEL_CONSTRAINTS = { min: BOTTOM_PANEL_MIN, max: BOTTOM_PANEL_MAX };

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      theme: "dark",
      resolvedTheme: "dark",
      accent: "blue",

      sidebarOpen: true,
      sidebarWidth: 260,

      bottomPanelOpen: false,
      bottomPanelHeight: 240,

      activeView: "explorer",

      commandPaletteOpen: false,

      setTheme: (theme) => set({ theme }),
      setResolvedTheme: (resolvedTheme) => set({ resolvedTheme }),
      setAccent: (accent) => set({ accent }),

      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
      setSidebarWidth: (width) =>
        set({ sidebarWidth: Math.min(SIDEBAR_MAX, Math.max(SIDEBAR_MIN, width)) }),

      toggleBottomPanel: () => set((s) => ({ bottomPanelOpen: !s.bottomPanelOpen })),
      setBottomPanelOpen: (bottomPanelOpen) => set({ bottomPanelOpen }),
      setBottomPanelHeight: (height) =>
        set({
          bottomPanelHeight: Math.min(BOTTOM_PANEL_MAX, Math.max(BOTTOM_PANEL_MIN, height)),
        }),

      setActiveView: (activeView) => set({ activeView }),
      setCommandPaletteOpen: (commandPaletteOpen) => set({ commandPaletteOpen }),
    }),
    {
      name: "tui-ui-store",
      partialize: (s) => ({
        theme: s.theme,
        accent: s.accent,
        sidebarOpen: s.sidebarOpen,
        sidebarWidth: s.sidebarWidth,
        bottomPanelHeight: s.bottomPanelHeight,
      }),
    },
  ),
);