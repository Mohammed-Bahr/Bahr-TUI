import { useEffect, useRef, useState } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";
import { themes, defaultTheme, type TuiTheme } from "./themes";

const THEME_STORAGE_KEY = "tui.active-theme";

function loadInitialTheme(): TuiTheme {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved) {
      const found = themes.find((t) => t.id === saved);
      if (found) return found;
    }
  } catch {
    /* localStorage unavailable */
  }
  return defaultTheme;
}

function bootLines(accent: string) {
  return [
    "  ████████╗██╗   ██╗██╗        ",
    "  ╚══██╔══╝██║   ██║██║        ",
    "     ██║   ██║   ██║██║        ",
    "     ██║   ██║   ██║██║        ",
    "     ██║   ╚██████╔╝██║        ",
    "     ╚═╝    ╚═════╝ ╚═╝        ",
    "",
    `  \x1b[38;2;${hexToRgb(accent)}mWelcome to TUI — a beautiful terminal experience\x1b[0m`,
    "  Type 'help' to get started.",
    "",
  ].join("\r\n");
}

function hexToRgb(hex: string): string {
  const h = hex.replace("#", "");
  const v = parseInt(h, 16);
  return `${(v >> 16) & 255};${(v >> 8) & 255};${v & 255}`;
}

function hexToCssRgb(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const v = parseInt(h, 16);
  return `rgba(${(v >> 16) & 255},${(v >> 8) & 255},${v & 255},${alpha})`;
}

export default function App() {
  const terminalRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const settingsRef = useRef<HTMLDivElement>(null);

  const [theme, setTheme] = useState<TuiTheme>(loadInitialTheme);
  const [menuOpen, setMenuOpen] = useState(false);
  const themeRef = useRef(theme);
  themeRef.current = theme;

  useEffect(() => {
    if (!theme) {
      setTheme(defaultTheme);
    }
  }, [theme]);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  useEffect(() => {
    if (!terminalRef.current) return;

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
    term.open(terminalRef.current);
    fit.fit();
    fitRef.current = fit;

    term.writeln(bootLines(themeRef.current.ui.accent));

    const prompt = () =>
      term.write(
        `\x1b[1;38;2;${hexToRgb(themeRef.current.ui.accent2)}m➜ \x1b[0m\x1b[38;2;${hexToRgb(themeRef.current.ui.accent)}mtui\x1b[0m ~ $ `,
      );
    prompt();

    const handleResize = () => fit.fit();
    window.addEventListener("resize", handleResize);

    const help = () =>
      term.writeln(
        [
          `\x1b[1;38;2;${hexToRgb(themeRef.current.ui.accent)}mAvailable commands:\x1b[0m`,
          "  \x1b[32mhelp\x1b[0m   show this message",
          "  \x1b[32mwhoami\x1b[0m  who you are",
          "  \x1b[32mdate\x1b[0m   current date & time",
          "  \x1b[32mclear\x1b[0m  clear the terminal",
          "",
        ].join("\r\n"),
      );

    let line = "";
    term.onData((data) => {
      if (data === "\r") {
        term.write("\r\n");
        const cmd = line;
        line = "";
        switch (cmd.trim()) {
          case "help":
            help();
            break;
          case "whoami":
            term.writeln("  \x1b[35mYou are a beautiful human using a TUI. ✨\x1b[0m");
            break;
          case "date":
            term.writeln("  " + new Date().toString());
            break;
          case "clear":
            term.clear();
            break;
          case "":
            break;
          default:
            term.writeln(`  \x1b[1;31mcommand not found:\x1b[0m \x1b[33m${cmd}\x1b[0m`);
        }
        prompt();
      } else if (data === "\x7f") {
        if (line.length > 0) {
          line = line.slice(0, -1);
          term.write("\b \b");
        }
      } else {
        line += data;
        term.write(data);
      }
    });

    termRef.current = term;
    return () => {
      window.removeEventListener("resize", handleResize);
      term.dispose();
      termRef.current = null;
      fitRef.current = null;
    };
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme.id);
    } catch {
      /* ignore */
    }
    if (termRef.current) {
      termRef.current.options.theme = theme.colors;
    }
    requestAnimationFrame(() => fitRef.current?.fit());
  }, [theme]);

  const selectTheme = (t: TuiTheme) => {
    setTheme(t);
    setMenuOpen(false);
  };

  const ui = theme.ui;

  return (
    <div
      className="flex h-screen w-screen flex-col overflow-hidden text-gray-200 antialiased transition-colors duration-300"
      style={{ background: ui.background, color: ui.text }}
    >
      <div
        className="pointer-events-none absolute inset-0 transition-opacity duration-300"
        style={{
          background: `radial-gradient(ellipse at top, ${hexToCssRgb(ui.accent, 0.09)}, transparent 55%), radial-gradient(ellipse at bottom left, ${hexToCssRgb(ui.accent2, 0.06)}, transparent 50%)`,
        }}
      />

      <div className="relative flex min-h-0 flex-1 flex-col gap-4 p-4 sm:p-6">
        <header
          className="flex shrink-0 items-center justify-between rounded-xl border px-5 py-3 backdrop-blur transition-colors duration-300"
          style={{
            borderColor: hexToCssRgb(ui.text, 0.06),
            background: hexToCssRgb(ui.surface, 0.35),
          }}
        >
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
              <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
              <span className="h-3 w-3 rounded-full bg-[#28c840]" />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold tracking-wide" style={{ color: ui.text }}>
                TUI
              </span>
              <span
                className="rounded-md px-2 py-0.5 text-xs font-medium"
                style={{ background: ui.accentSoft, color: ui.accent }}
              >
                interactive shell
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 text-xs sm:flex" style={{ color: ui.muted }}>
              <span className="inline-block h-2 w-2 animate-pulse rounded-full" style={{ background: ui.accent2 }} />
              <span>live session</span>
            </div>

            <div ref={settingsRef} className="relative">
              <button
                onClick={() => setMenuOpen((o) => !o)}
                aria-label="Theme settings"
                className="flex h-9 w-9 items-center justify-center rounded-lg border transition-transform duration-200 hover:rotate-45"
                style={{
                  borderColor: menuOpen ? ui.accent : hexToCssRgb(ui.text, 0.12),
                  background: menuOpen ? ui.accentSoft : "transparent",
                  color: ui.text,
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
              </button>

              {menuOpen && (
                <div
                  className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-xl border shadow-2xl backdrop-blur-xl"
                  style={{
                    borderColor: hexToCssRgb(ui.accent, 0.25),
                    background: hexToCssRgb(ui.surface, 0.92),
                    boxShadow: `0 20px 60px -15px ${hexToCssRgb(ui.accent, 0.35)}`,
                  }}
                >
                  <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: hexToCssRgb(ui.text, 0.08) }}>
                    <div>
                      <div className="text-sm font-semibold" style={{ color: ui.text }}>
                        Themes
                      </div>
                      <div className="text-xs" style={{ color: ui.muted }}>
                        pick a look for your terminal
                      </div>
                    </div>
                    <span
                      className="rounded px-2 py-0.5 font-mono text-[10px]"
                      style={{ background: ui.accentSoft, color: ui.accent }}
                    >
                      {themes.length} files
                    </span>
                  </div>

                  <div className="max-h-80 overflow-y-auto p-2">
                    {themes.map((t) => {
                      const active = t.id === theme.id;
                      return (
                        <button
                          key={t.id}
                          onClick={() => selectTheme(t)}
                          className="group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors"
                          style={{
                            background: active ? ui.accentSoft : "transparent",
                            color: ui.text,
                          }}
                        >
                          <span className="flex flex-col gap-1">
                            <span className="flex h-2.5 w-16 gap-0.5 overflow-hidden rounded-sm">
                              {["red", "yellow", "green", "cyan", "blue", "magenta"].map((c) => (
                                <span key={c} className="flex-1" style={{ background: t.colors[c as keyof typeof t.colors] }} />
                              ))}
                            </span>
                            <span className="flex h-1.5 w-16 gap-0.5 overflow-hidden rounded-sm">
                              {["brightRed", "brightYellow", "brightGreen", "brightCyan", "brightBlue", "brightMagenta"].map((c) => (
                                <span key={c} className="flex-1" style={{ background: t.colors[c as keyof typeof t.colors] }} />
                              ))}
                            </span>
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium">{t.name}</span>
                            <span className="block truncate text-xs" style={{ color: ui.muted }}>
                              {t.description}
                            </span>
                          </span>
                          <span
                            className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2"
                            style={{
                              borderColor: active ? ui.accent : hexToCssRgb(ui.text, 0.15),
                              background: active ? ui.accent : "transparent",
                            }}
                          >
                            {active && (
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#0b0f14" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            )}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="border-t px-4 py-2.5 text-center font-mono text-[10px]" style={{ borderColor: hexToCssRgb(ui.text, 0.08), color: ui.muted }}>
                    add a new look by dropping a .json into <span style={{ color: ui.accent }}>src/themes/</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <main
          className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border backdrop-blur transition-colors duration-300"
          style={{
            borderColor: hexToCssRgb(ui.accent, 0.15),
            background: hexToCssRgb(ui.surface, 0.92),
            boxShadow: `0 0 60px -15px ${hexToCssRgb(ui.accent, 0.35)}`,
          }}
        >
          <div className="flex shrink-0 items-center justify-between border-b px-4 py-2.5" style={{ borderColor: hexToCssRgb(ui.text, 0.05) }}>
            <div className="flex items-center gap-2 text-sm">
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: ui.accent, boxShadow: `0 0 10px ${ui.accent}` }}
              />
              <span className="font-mono" style={{ color: ui.text }}>
                ~/tui
              </span>
            </div>
            <div className="font-mono text-xs tracking-widest" style={{ color: ui.muted }}>
              {theme.name} · {termRef.current?.cols ?? "80"}×{termRef.current?.rows ?? "24"}
            </div>
          </div>

          <div ref={terminalRef} className="min-h-0 flex-1 px-2 py-2 [&_.xterm]:h-full" />

          <footer className="flex shrink-0 items-center justify-between border-t px-4 py-2 font-mono text-xs" style={{ borderColor: hexToCssRgb(ui.text, 0.05), background: "rgba(0,0,0,0.25)" }}>
            <div className="flex items-center gap-4">
              <span style={{ color: ui.accent2 }}>●</span>
              <span style={{ color: ui.muted }}>NORMAL</span>
              <span style={{ color: ui.muted, opacity: 0.5 }}>|</span>
              <span style={{ color: ui.muted }}>
                UTF-8 <span style={{ color: ui.muted, opacity: 0.5 }}>|</span> unix
              </span>
            </div>
            <div className="hidden md:block" style={{ color: ui.muted }}>
              tui ~ type "help"
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded px-2 py-0.5" style={{ background: ui.accentSoft, color: ui.accent }}>
                ESC
              </span>
              <span style={{ color: ui.muted, opacity: 0.5 }}>·</span>
              <span className="rounded px-2 py-0.5" style={{ background: hexToCssRgb(ui.accent2, 0.1), color: ui.accent2 }}>
                TS
              </span>
              <span style={{ color: ui.muted, opacity: 0.5 }}>·</span>
              <span className="rounded px-2 py-0.5" style={{ background: hexToCssRgb(ui.text, 0.08), color: ui.text }}>
                Tailwind
              </span>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
}