import { create } from "zustand";

export type TabKind = "note" | "graph";

export interface Tab {
  id: string;
  kind: TabKind;
  /** "note:<path>" or "graph:<vaultPath>" */
  key: string;
  name: string;
}

export interface Pane {
  id: string;
  tabIds: string[];
  activeTabId: string | null;
  /** relative flex weight */
  size: number;
}

interface WorkspaceState {
  tabs: Record<string, Tab>;
  panes: Pane[];
  activePaneId: string | null;
  openNote: (path: string, name: string) => void;
  openGraph: (vaultPath: string) => void;
  closeTab: (paneId: string, tabId: string) => void;
  setActiveTab: (paneId: string, tabId: string) => void;
  setActivePane: (paneId: string) => void;
  moveTab: (tabId: string, toPaneId: string, index: number) => void;
  splitWithTab: (tabId: string, fromPaneId: string, side: "before" | "after") => void;
  resizePanes: (leftId: string, rightId: string, leftSize: number) => void;
}

const normalize = (panes: Pane[]): Pane[] => {
  const nonEmpty =
    panes.length === 1 ? panes : panes.filter((p) => p.tabIds.length > 0);
  const total = nonEmpty.reduce((a, p) => a + p.size, 0) || 1;
  return nonEmpty.map((p) => ({ ...p, size: p.size / total }));
};

export const useWorkspaceStore = create<WorkspaceState>()((set) => ({
  tabs: {},
  panes: [{ id: crypto.randomUUID(), tabIds: [], activeTabId: null, size: 1 }],
  activePaneId: null,

  openNote: (path, name) =>
    set((s) => {
      // Focus existing tab if already open.
      for (const pane of s.panes) {
        for (const id of pane.tabIds) {
          if (s.tabs[id]?.key === `note:${path}`) {
            return {
              panes: s.panes.map((p) =>
                p.id === pane.id ? { ...p, activeTabId: id } : p,
              ),
              activePaneId: pane.id,
            };
          }
        }
      }

      const tab: Tab = {
        id: crypto.randomUUID(),
        kind: "note",
        key: `note:${path}`,
        name,
      };
      const target =
        s.panes.find((p) => p.id === s.activePaneId) ?? s.panes[0];

      if (!target) {
        const pane: Pane = {
          id: crypto.randomUUID(),
          tabIds: [tab.id],
          activeTabId: tab.id,
          size: 1,
        };
        return {
          tabs: { ...s.tabs, [tab.id]: tab },
          panes: [pane],
          activePaneId: pane.id,
        };
      }

      return {
        tabs: { ...s.tabs, [tab.id]: tab },
        panes: s.panes.map((p) =>
          p.id === target.id
            ? { ...p, tabIds: [...p.tabIds, tab.id], activeTabId: tab.id }
            : p,
        ),
        activePaneId: target.id,
      };
    }),

  openGraph: (vaultPath) =>
    set((s) => {
      const key = `graph:${vaultPath}`;
      for (const pane of s.panes) {
        for (const id of pane.tabIds) {
          if (s.tabs[id]?.key === key) {
            return {
              panes: s.panes.map((p) =>
                p.id === pane.id ? { ...p, activeTabId: id } : p,
              ),
              activePaneId: pane.id,
            };
          }
        }
      }
      const tab: Tab = { id: crypto.randomUUID(), kind: "graph", key, name: "Graph" };
      const target = s.panes.find((p) => p.id === s.activePaneId) ?? s.panes[0];
      if (!target) {
        const pane: Pane = {
          id: crypto.randomUUID(),
          tabIds: [tab.id],
          activeTabId: tab.id,
          size: 1,
        };
        return {
          tabs: { ...s.tabs, [tab.id]: tab },
          panes: [pane],
          activePaneId: pane.id,
        };
      }
      return {
        tabs: { ...s.tabs, [tab.id]: tab },
        panes: s.panes.map((p) =>
          p.id === target.id
            ? { ...p, tabIds: [...p.tabIds, tab.id], activeTabId: tab.id }
            : p,
        ),
        activePaneId: target.id,
      };
    }),

  closeTab: (paneId, tabId) =>
    set((s) => {
      const tabs = { ...s.tabs };
      delete tabs[tabId];
      let panes = s.panes.map((p) => {
        if (p.id !== paneId) return p;
        const idx = p.tabIds.indexOf(tabId);
        const tabIds = p.tabIds.filter((id) => id !== tabId);
        const activeTabId =
          p.activeTabId === tabId
            ? (tabIds[Math.max(0, idx - 1)] ?? null)
            : p.activeTabId;
        return { ...p, tabIds, activeTabId };
      });
      if (!panes.some((p) => p.tabIds.length > 0)) {
        panes = [
          { id: crypto.randomUUID(), tabIds: [], activeTabId: null, size: 1 },
        ];
      }
      return { tabs, panes: normalize(panes) };
    }),

  setActiveTab: (paneId, tabId) =>
    set((s) => ({
      panes: s.panes.map((p) =>
        p.id === paneId ? { ...p, activeTabId: tabId } : p,
      ),
      activePaneId: paneId,
    })),

  setActivePane: (paneId) => set({ activePaneId: paneId }),

  moveTab: (tabId, toPaneId, index) =>
    set((s) => {
      let panes = s.panes.map((p) =>
        p.id === toPaneId
          ? p
          : {
              ...p,
              tabIds: p.tabIds.filter((id) => id !== tabId),
              activeTabId:
                p.activeTabId === tabId
                  ? (p.tabIds.filter((id) => id !== tabId)[0] ?? null)
                  : p.activeTabId,
            },
      );
      panes = panes.map((p) => {
        if (p.id !== toPaneId) return p;
        const ids = p.tabIds.filter((id) => id !== tabId);
        const at = Math.max(0, Math.min(index, ids.length));
        ids.splice(at, 0, tabId);
        return { ...p, tabIds: ids, activeTabId: tabId };
      });
      return { panes: normalize(panes), activePaneId: toPaneId };
    }),

  splitWithTab: (tabId, fromPaneId, side) =>
    set((s) => {
      const src = s.panes.find((p) => p.tabIds.includes(tabId));
      // Only meaningful when the source pane has other tabs; otherwise the tab already has its own space.
      if (!src || src.tabIds.length <= 1) return {};
      const half = src.size / 2;
      const newPane: Pane = {
        id: crypto.randomUUID(),
        tabIds: [tabId],
        activeTabId: tabId,
        size: half,
      };
      let panes = s.panes.map((p) =>
        p.tabIds.includes(tabId)
          ? {
              ...p,
              tabIds: p.tabIds.filter((id) => id !== tabId),
              activeTabId:
                p.activeTabId === tabId
                  ? (p.tabIds.filter((id) => id !== tabId)[0] ?? null)
                  : p.activeTabId,
            }
          : p,
      );
      const anchorIdx = panes.findIndex((p) => p.id === fromPaneId);
      if (anchorIdx < 0) return {};
      panes[anchorIdx] = { ...panes[anchorIdx], size: panes[anchorIdx].size - half };
      panes.splice(side === "after" ? anchorIdx + 1 : anchorIdx, 0, newPane);
      return { panes: normalize(panes), activePaneId: newPane.id };
    }),

  resizePanes: (leftId, rightId, leftSize) =>
    set((s) => ({
      panes: s.panes.map((p) => {
        if (p.id === leftId)
          return { ...p, size: Math.max(0.12, Math.min(0.88, leftSize)) };
        if (p.id === rightId)
          return { ...p, size: Math.max(0.12, Math.min(0.88, 1 - leftSize)) };
        return p;
      }),
    })),
}));
