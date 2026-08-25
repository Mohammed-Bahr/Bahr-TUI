import { Fragment, useCallback, useRef } from "react";
import {
  useWorkspaceStore,
  type Tab,
} from "@/stores/workspace";
import MarkdownEditor from "@/components/editor/MarkdownEditor";
import GraphView from "@/components/GraphView";
import { readDraggedTab } from "@/components/TabsBar";
import { useTuiTheme } from "@/themes/ThemeContext";
import { hexToCssRgb } from "@/lib/color";

function TabContent({
  tab,
  vaultPath,
  onOpenNoteRef,
}: {
  tab: Tab;
  vaultPath: string;
  onOpenNoteRef: (target: string, name: string) => void;
}) {
  const openNote = useWorkspaceStore((s) => s.openNote);
  if (tab.kind === "graph") {
    return <GraphView vaultPath={vaultPath} onOpenPath={(p, n) => openNote(p, n)} />;
  }
  return (
    <MarkdownEditor
      key={tab.key}
      path={tab.key.slice("note:".length)}
      onOpenNote={onOpenNoteRef}
    />
  );
}

function EmptyPaneHint() {
  const { theme } = useTuiTheme();
  const ui = theme.ui;
  return (
    <div className="flex h-full items-center justify-center px-6 text-center">
      <p className="text-xs leading-relaxed" style={{ color: ui.muted }}>
        Open a note from the sidebar, drop a dragged tab here, or drag a tab to
        either edge to split.
      </p>
    </div>
  );
}

export default function Panes({
  vaultPath,
  onOpenNoteRef,
}: {
  vaultPath: string;
  onOpenNoteRef: (target: string, name: string) => void;
}) {
  const { theme } = useTuiTheme();
  const ui = theme.ui;
  const panes = useWorkspaceStore((s) => s.panes);
  const tabs = useWorkspaceStore((s) => s.tabs);
  const resizePanes = useWorkspaceStore((s) => s.resizePanes);
  const containerRef = useRef<HTMLDivElement>(null);

  const startResize = useCallback(
    (index: number, e: React.PointerEvent) => {
      e.preventDefault();
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const startX = e.clientX;
      const sizes = panes.map((p) => p.size);

      const onMove = (ev: PointerEvent) => {
        const deltaPx = ev.clientX - startX;
        const delta = deltaPx / rect.width;
        const left = panes[index];
        const right = panes[index + 1];
        if (!left || !right) return;
        resizePanes(left.id, right.id, sizes[index] + delta);
      };
      const onUp = () => {
        document.body.style.cursor = "";
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
      };
      document.body.style.cursor = "col-resize";
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    },
    [panes, resizePanes],
  );

  const handleContentDrop = useWorkspaceStore((s) => s.moveTab);
  const splitWithTab = useWorkspaceStore((s) => s.splitWithTab);

  return (
    <div ref={containerRef} className="flex h-full min-h-0 w-full">
      {panes.map((pane, i) => {
        const activeTab = pane.activeTabId ? tabs[pane.activeTabId] : undefined;
        return (
          <Fragment key={pane.id}>
            {i > 0 && (
              <div
                onPointerDown={(e) => startResize(i - 1, e)}
                className="w-1 shrink-0 cursor-col-resize transition-colors hover:bg-accent/40"
                style={{ background: hexToCssRgb(ui.text, 0.08) }}
              />
            )}
            <section
              className="flex h-full min-w-0 flex-col overflow-hidden"
              style={{ flex: `${pane.size} 1 0%` }}
              onPointerDown={() =>
                useWorkspaceStore.getState().setActivePane(pane.id)
              }
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                const tabId = readDraggedTab(e);
                if (!tabId) return;
                const rect = e.currentTarget.getBoundingClientRect();
                const rel = (e.clientX - rect.left) / rect.width;
                const srcPane = useWorkspaceStore
                  .getState()
                  .panes.find((p) => p.tabIds.includes(tabId));
                const canSplit =
                  rel < 0.22 || rel > 0.78 ? (srcPane?.tabIds.length ?? 0) > 1 : false;
                if (canSplit)
                  splitWithTab(
                    tabId,
                    pane.id,
                    rel < 0.22 ? "before" : "after",
                  );
                else handleContentDrop(tabId, pane.id, pane.tabIds.length);
              }}
              >
                <div className="min-h-0 flex-1 overflow-hidden">
                  {activeTab ? (
                    <TabContent tab={activeTab} vaultPath={vaultPath} onOpenNoteRef={onOpenNoteRef} />
                  ) : (
                    <EmptyPaneHint />
                  )}
                </div>
            </section>
          </Fragment>
        );
      })}
    </div>
  );
}
