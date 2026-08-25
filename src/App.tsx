import { useCallback, useEffect, useState } from "react";
import "./App.css";
import ButtonsBar from "@/components/ButtonsBar";
import Panes from "@/components/Panes";
import Sidebar from "@/components/Sidebar";
import TabsBar from "@/components/TabsBar";
import TerminalPane from "@/components/terminal";
import TerminalRail from "@/components/TerminalRail";
import { useTuiTheme, TuiThemeProvider } from "@/themes/ThemeContext";
import { hexToCssRgb } from "@/lib/color";
import { isMarkdown, writeFile, type DirEntry } from "@/lib/api";
import { useWorkspaceStore } from "@/stores/workspace";
import { useActiveVault } from "@/stores/vaults";
import { useTerminalStore } from "@/stores/terminals";

const SIDEBAR_MIN_WIDTH = 180;
const SIDEBAR_DEFAULT_WIDTH = 260;
const TERMINAL_MIN_WIDTH = 180;
const TERMINAL_DEFAULT_WIDTH = 420;

function dirname(path: string): string {
  const i = path.lastIndexOf("/");
  return i > 0 ? path.slice(0, i) : "/";
}

/** Path of the note in the focused pane's active tab. */
function useActiveNotePath(): string | null {
  const panes = useWorkspaceStore((s) => s.panes);
  const activePaneId = useWorkspaceStore((s) => s.activePaneId);
  const tabs = useWorkspaceStore((s) => s.tabs);
  const pane = panes.find((p) => p.id === activePaneId) ?? panes[0];
  if (!pane?.activeTabId) return null;
  const tab = tabs[pane.activeTabId];
  return tab?.kind === "note" ? tab.key.slice("note:".length) : null;
}

function Workspace() {
  const { theme } = useTuiTheme();
  const ui = theme.ui;

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState(SIDEBAR_DEFAULT_WIDTH);
  const [terminalOpen, setTerminalOpen] = useState(true);
  const [terminalWidth, setTerminalWidth] = useState(TERMINAL_DEFAULT_WIDTH);

  const sessions = useTerminalStore((s) => s.sessions);
  const activeId = useTerminalStore((s) => s.activeId);
  const createSession = useTerminalStore((s) => s.createSession);

  // Keep at least one terminal session alive.
  useEffect(() => {
    if (sessions.length === 0) void createSession();
  }, [sessions.length, createSession]);

  const activeVault = useActiveVault();
  const vaultPath = activeVault?.path ?? null;

  // Focused pane — its tabs render in the top bar.
  const panes = useWorkspaceStore((s) => s.panes);
  const activePaneId = useWorkspaceStore((s) => s.activePaneId);
  const focusedPane =
    panes.find((p) => p.id === activePaneId) ?? panes[0] ?? null;

  /** Resolve a wikilink target (name or absolute path) and open it as a note. */
  const openNoteRef = useCallback(
    async (target: string, name: string) => {
      const ws = useWorkspaceStore.getState();
      if (target.startsWith("/")) {
        ws.openNote(target, name);
        return;
      }
      const { useVaultIndexStore } = await import("@/stores/vaultIndex");
      const idx = useVaultIndexStore.getState();
      const cleanName = name.replace(/\.md$/i, "");
      const found = idx.notes.find(
        (n) =>
          n.base.toLowerCase() ===
          target.toLowerCase().replace(/\.md$/, ""),
      );
      if (found) {
        ws.openNote(found.path, found.base + ".md");
        return;
      }
      if (vaultPath) {
        const path = `${vaultPath}/${cleanName}.md`;
        try {
          await writeFile(path, `# ${cleanName}\n\n`);
        } catch {
          return;
        }
        void idx.reindex(vaultPath);
        ws.openNote(path, `${cleanName}.md`);
      }
    },
    [vaultPath],
  );

  const openFile = useCallback(
    (entry: DirEntry) => {
      if (isMarkdown(entry.name)) {
        useWorkspaceStore.getState().openNote(entry.path, entry.name);
      } else {
        void useTerminalStore
          .getState()
          .createSession({
            title: entry.name,
            cwd: dirname(entry.path),
            program: "nvim",
            args: [entry.path],
          })
          .then(() => setTerminalOpen(true));
      }
    },
    [],
  );

  const onSidebarResizeStart = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      const startX = e.clientX;
      const startWidth = sidebarWidth;

      const onMove = (ev: PointerEvent) =>
        setSidebarWidth(
          Math.max(SIDEBAR_MIN_WIDTH, Math.min(560, startWidth + (ev.clientX - startX))),
        );
      const onUp = () => {
        document.body.style.cursor = "";
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
      };

      document.body.style.cursor = "col-resize";
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    },
    [sidebarWidth],
  );

  const onTerminalResizeStart = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      const startX = e.clientX;
      const startWidth = terminalWidth;

      const onMove = (ev: PointerEvent) => {
        setTerminalWidth(
          Math.min(window.innerWidth - 80, Math.max(TERMINAL_MIN_WIDTH, startWidth - (ev.clientX - startX))),
        );
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
    [terminalWidth],
  );

  const selectedPath = useActiveNotePath();

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden">
      <ButtonsBar
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen((o) => !o)}
        terminalOpen={terminalOpen}
        onToggleTerminal={() => setTerminalOpen((o) => !o)}
      >
        {focusedPane && <TabsBar pane={focusedPane} />}
      </ButtonsBar>

      <div className="flex min-h-0 flex-1">
        {sidebarOpen && (
          <>
            <aside
              className="min-h-0 shrink-0 overflow-hidden border-r"
              style={{
                width: sidebarWidth,
                borderColor: hexToCssRgb(ui.text, 0.1),
                background: ui.background,
              }}
            >
              <Sidebar
                selectedPath={selectedPath}
                onOpenFile={openFile}
              />
            </aside>
            <div
              onPointerDown={onSidebarResizeStart}
              onDoubleClick={() => setSidebarWidth(SIDEBAR_DEFAULT_WIDTH)}
              className="w-1 shrink-0 cursor-col-resize transition-colors hover:bg-accent/40 active:bg-accent/60"
              style={{ background: hexToCssRgb(ui.text, 0.08) }}
            />
          </>
        )}

        <main
          className="relative min-h-0 min-w-0 flex-1 overflow-hidden"
          style={{ background: ui.background }}
        >
          {vaultPath ? (
            <Panes vaultPath={vaultPath} onOpenNoteRef={(t, n) => void openNoteRef(t, n)} />
          ) : (
            <div className="flex h-full items-center justify-center">
              <p className="text-sm" style={{ color: ui.muted }}>
                Add a vault in the sidebar to start taking notes.
              </p>
            </div>
          )}
        </main>

        {terminalOpen && (
          <>
            <div
              onPointerDown={onTerminalResizeStart}
              onDoubleClick={() => setTerminalWidth(TERMINAL_DEFAULT_WIDTH)}
              className="w-1 shrink-0 cursor-col-resize transition-colors hover:bg-accent/40 active:bg-accent/60"
              style={{ background: hexToCssRgb(ui.text, 0.08) }}
            />
            <aside
              className="min-h-0 shrink-0 overflow-hidden border-l py-4"
              style={{
                width: terminalWidth,
                borderColor: hexToCssRgb(ui.text, 0.1),
                background: ui.background,
              }}
            >
              {sessions.map((s) => (
                <TerminalPane
                  key={s.id}
                  sessionId={s.pid}
                  cwd={s.cwd}
                  program={s.program}
                  args={s.args}
                  visible={s.id === activeId}
                />
              ))}
            </aside>
          </>
        )}

        <TerminalRail
          panelOpen={terminalOpen}
          onTogglePanel={() => setTerminalOpen((o) => !o)}
        />
      </div>
    </div>
  );
}

const App = () => (
  <TuiThemeProvider>
    <Workspace />
  </TuiThemeProvider>
);

export default App;
