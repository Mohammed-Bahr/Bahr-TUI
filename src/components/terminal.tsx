import { useEffect, useRef } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";
import { listen } from "@tauri-apps/api/event";
import { useTuiTheme } from "@/themes/ThemeContext";
import {
  ptyKill,
  ptyResize,
  ptySpawn,
  ptyWrite,
  type PtyOutputEvent,
} from "@/lib/api";

export interface TerminalPaneProps {
  /** Stable PTY session id — one xterm per id, survives being hidden. */
  sessionId: string;
  cwd?: string;
  program?: string;
  args?: string[];
  visible: boolean;
}

export default function TerminalPane({
  sessionId,
  cwd,
  program,
  args,
  visible,
}: TerminalPaneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const spawnedRef = useRef(false);

  const { theme } = useTuiTheme();
  const themeRef = useRef(theme);
  themeRef.current = theme;

  // Create the xterm.js instance once and spawn its PTY.
  useEffect(() => {
    if (!containerRef.current) return;
    const host = containerRef.current;

    const term = new Terminal({
      cursorBlink: true,
      fontFamily: '"JetBrains Mono", "Fira Code", "Cascadia Code", monospace',
      fontSize: 14,
      lineHeight: 1.2,
      letterSpacing: 0.4,
      theme: themeRef.current.colors,
      scrollback: 5000,
    });

    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(host);
    fitRef.current = fit;
    termRef.current = term;

    let disposed = false;
    const unlisteners: Array<() => void> = [];

    const resizePty = () => {
      try {
        fit.fit();
      } catch {
        /* container may be hidden */
      }
      if (term.cols > 0 && term.rows > 0)
        void ptyResize(sessionId, term.cols, term.rows);
    };

    const handleResize = () => {
      if (!visible) return;
      resizePty();
    };

    window.addEventListener("resize", handleResize);
    const observer = new ResizeObserver(handleResize);
    observer.observe(host);

    const dataSub = term.onData((data) => void ptyWrite(sessionId, data));

    const setup = async () => {
      const outUnlisten = await listen<PtyOutputEvent>("pty-output", (e) => {
        if (e.payload.id !== sessionId) return;
        term.write(e.payload.data);
      });
      const exitUnlisten = await listen<string>("pty-exit", (e) => {
        if (e.payload !== sessionId) return;
        term.write("\r\n\x1b[2m[session ended]\x1b[0m\r\n");
      });
      if (disposed) {
        outUnlisten();
        exitUnlisten();
        return;
      }
      unlisteners.push(outUnlisten, exitUnlisten);

      if (spawnedRef.current) return;
      spawnedRef.current = true;
      requestAnimationFrame(resizePty);
      try {
        await ptySpawn(sessionId, cwd ?? "/", program, args);
      } catch (e) {
        term.writeln(`\r\n\x1b[31mFailed to start session: ${String(e)}\x1b[0m\r\n`);
      }
    };

    void setup();

    return () => {
      disposed = true;
      window.removeEventListener("resize", handleResize);
      observer.disconnect();
      dataSub.dispose();
      for (const un of unlisteners) un();
      term.dispose();
      termRef.current = null;
      fitRef.current = null;
      void ptyKill(sessionId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  // Theme updates
  useEffect(() => {
    if (termRef.current) termRef.current.options.theme = theme.colors;
  }, [theme]);

  // Refit when becoming visible.
  useEffect(() => {
    if (!visible) return;
    requestAnimationFrame(() => {
      try {
        fitRef.current?.fit();
      } catch {
        /* ignore */
      }
      const term = termRef.current;
      if (term && term.cols > 0 && term.rows > 0)
        void ptyResize(sessionId, term.cols, term.rows);
    });
  }, [visible, sessionId]);

  return (
    <div
      className="h-full min-h-0 w-full"
      style={{ display: visible ? undefined : "none" }}
    >
      <div
        ref={containerRef}
        className="min-h-0 h-full px-2 py-2 [&_.xterm]:h-full"
      />
    </div>
  );
}
