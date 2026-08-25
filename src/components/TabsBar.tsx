import { useCallback, useRef } from "react";
import { FileText, Network, X } from "lucide-react";
import {
  useWorkspaceStore,
  type Pane,
  type Tab,
} from "@/stores/workspace";
import { useTuiTheme } from "@/themes/ThemeContext";
import { hexToCssRgb } from "@/lib/color";

const DND_MIME = "application/x-tui-tab";

export function readDraggedTab(e: React.DragEvent): string | null {
  return e.dataTransfer.getData(DND_MIME) || null;
}

interface TabsBarProps {
  pane: Pane;
}

/** Tab strip of a single pane — rendered in the top bar for the focused pane. */
export default function TabsBar({ pane }: TabsBarProps) {
  const { theme } = useTuiTheme();
  const ui = theme.ui;
  const tabs = useWorkspaceStore((s) => s.tabs);
  const setActiveTab = useWorkspaceStore((s) => s.setActiveTab);
  const closeTab = useWorkspaceStore((s) => s.closeTab);
  const moveTab = useWorkspaceStore((s) => s.moveTab);
  const insertIndicator = useRef<number | null>(null);

  const handleDropOnBar = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const tabId = readDraggedTab(e);
      if (!tabId) return;
      moveTab(tabId, pane.id, insertIndicator.current ?? pane.tabIds.length);
    },
    [moveTab, pane.id, pane.tabIds.length],
  );

  const handleDropOnTab = useCallback(
    (e: React.DragEvent, index: number) => {
      e.preventDefault();
      e.stopPropagation();
      const tabId = readDraggedTab(e);
      if (!tabId) return;
      let at = index;
      const currentIndex = pane.tabIds.indexOf(tabId);
      if (currentIndex >= 0 && currentIndex < index) at -= 1;
      moveTab(tabId, pane.id, at);
    },
    [moveTab, pane.id, pane.tabIds],
  );

  return (
    <div
      className="flex min-w-0 flex-1 items-stretch self-stretch overflow-x-auto"
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDropOnBar}
    >
      {pane.tabIds.length === 0 && (
        <span
          className="flex items-center px-2 text-[12px] italic select-none"
          style={{ color: ui.muted }}
        >
          No tabs open
        </span>
      )}
      {pane.tabIds.map((id, i) => {
        const tab = tabs[id] as Tab | undefined;
        if (!tab) return null;
        const active = pane.activeTabId === id;
        return (
          <div
            key={id}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData(DND_MIME, tab.id);
              e.dataTransfer.effectAllowed = "move";
            }}
            onDragOver={(e) => {
              e.preventDefault();
              const rect = e.currentTarget.getBoundingClientRect();
              insertIndicator.current =
                e.clientX > rect.left + rect.width / 2 ? i + 1 : i;
            }}
            onDrop={(e) => handleDropOnTab(e, insertIndicator.current ?? i)}
            onClick={() => setActiveTab(pane.id, id)}
            className="group flex cursor-pointer items-center gap-1.5 rounded-t-md border-b-2 px-3 text-[12px] font-medium select-none transition-colors duration-150 hover:bg-white/5"
            style={{
              borderBottomColor: active ? ui.accent : "transparent",
              background:
                active ? hexToCssRgb(ui.text, 0.07) : "transparent",
              color: active ? ui.accent : ui.muted,
            }}
          >
            {tab.kind === "graph" ? (
              <Network className="h-3 w-3 shrink-0" />
            ) : (
              <FileText className="h-3 w-3 shrink-0" />
            )}
            <span className="max-w-[140px] truncate">{tab.name}</span>
            <button
              type="button"
              title="Close tab"
              onClick={(e) => {
                e.stopPropagation();
                closeTab(pane.id, id);
              }}
              className="flex h-4 w-4 items-center justify-center rounded opacity-0 transition group-hover:opacity-100 hover:bg-white/10"
              style={{ color: ui.muted }}
            >
              <X className="h-2.5 w-2.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
