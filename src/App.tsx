import { useCallback, useState } from "react";
import "./App.css";
import ButtonsBar from "@/components/ButtonsBar";
import Terminal from "@/components/terminal";
import { TuiThemeProvider, useTuiTheme } from "@/themes/ThemeContext";
import { hexToCssRgb } from "@/lib/color";

const TERMINAL_MIN_WIDTH = 180;
const TERMINAL_DEFAULT_WIDTH = 420;

function Workspace() {
  const { theme } = useTuiTheme();
  const ui = theme.ui;

  const [terminalOpen, setTerminalOpen] = useState(false);
  const [terminalWidth, setTerminalWidth] = useState(TERMINAL_DEFAULT_WIDTH);

  const maxTerminalWidth =
    typeof window !== "undefined" ? window.innerWidth - 120 : 1200;

  const onResizeStart = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      const startX = e.clientX;
      const startWidth = terminalWidth;

      const onMove = (ev: PointerEvent) => {
        const width = startWidth - (ev.clientX - startX);
        setTerminalWidth(
          Math.min(window.innerWidth - 80, Math.max(TERMINAL_MIN_WIDTH, width)),
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

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden">
      <ButtonsBar
        terminalOpen={terminalOpen}
        onToggleTerminal={() => setTerminalOpen((o) => !o)}
      />

      <div className="flex min-h-0 flex-1">
        <main
          className="relative min-h-0 min-w-0 flex-1 overflow-hidden transition-colors duration-300"
          style={{ background: ui.background }}
        >
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background: `radial-gradient(ellipse at top, ${hexToCssRgb(ui.accent, 0.09)}, transparent 55%), radial-gradient(ellipse at bottom left, ${hexToCssRgb(ui.accent2, 0.06)}, transparent 50%)`,
            }}
          />
          <div className="relative flex h-full items-center justify-center">
            <p className="text-sm" style={{ color: ui.muted }}>
              Press the terminal button in the top bar to open a shell.
            </p>
          </div>
        </main>

        {terminalOpen && (
          <>
            <div
              onPointerDown={onResizeStart}
              onDoubleClick={() => setTerminalWidth(TERMINAL_DEFAULT_WIDTH)}
              className="w-1 shrink-0 cursor-col-resize transition-colors hover:bg-accent/40 active:bg-accent/60"
              style={{ background: hexToCssRgb(ui.text, 0.08) }}
            />
            <aside
              className="min-h-0 shrink-0 overflow-hidden border-l"
              style={{
                width: Math.min(terminalWidth, maxTerminalWidth),
                borderColor: hexToCssRgb(ui.text, 0.1),
                background: ui.background,
              }}
            >
              <Terminal />
            </aside>
          </>
        )}
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
