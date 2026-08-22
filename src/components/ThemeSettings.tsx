import { useEffect, useRef, useState } from "react";
import { themes } from "@/themes";
import { useTuiTheme } from "@/themes/ThemeContext";
import { hexToCssRgb } from "@/lib/color";

export function ThemeSettings() {
  const { theme, setTheme } = useTuiTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);

  const ui = theme.ui;

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (
        settingsRef.current &&
        !settingsRef.current.contains(e.target as Node)
      ) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const selectTheme = (t: (typeof themes)[number]) => {
    setTheme(t);
    setMenuOpen(false);
  };

  return (
    <div ref={settingsRef} className="relative">
      <button
        type="button"
        onClick={() => setMenuOpen((o) => !o)}
        aria-label="Theme settings"
        className="flex h-7 w-7 items-center justify-center rounded-full transition-transform duration-200 hover:rotate-45"
        style={{
          background: menuOpen ? ui.accentSoft : hexToCssRgb(ui.text, 0.08),
          color: ui.text,
        }}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
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
          <div
            className="flex items-center justify-between border-b px-4 py-3"
            style={{ borderColor: hexToCssRgb(ui.text, 0.08) }}
          >
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
                      {[
                        "red",
                        "yellow",
                        "green",
                        "cyan",
                        "blue",
                        "magenta",
                      ].map((c) => (
                        <span
                          key={c}
                          className="flex-1"
                          style={{
                            background: t.colors[c as keyof typeof t.colors],
                          }}
                        />
                      ))}
                    </span>
                    <span className="flex h-1.5 w-16 gap-0.5 overflow-hidden rounded-sm">
                      {[
                        "brightRed",
                        "brightYellow",
                        "brightGreen",
                        "brightCyan",
                        "brightBlue",
                        "brightMagenta",
                      ].map((c) => (
                        <span
                          key={c}
                          className="flex-1"
                          style={{
                            background: t.colors[c as keyof typeof t.colors],
                          }}
                        />
                      ))}
                    </span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">
                      {t.name}
                    </span>
                    <span
                      className="block truncate text-xs"
                      style={{ color: ui.muted }}
                    >
                      {t.description}
                    </span>
                  </span>
                  <span
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2"
                    style={{
                      borderColor: active
                        ? ui.accent
                        : hexToCssRgb(ui.text, 0.15),
                      background: active ? ui.accent : "transparent",
                    }}
                  >
                    {active && (
                      <svg
                        width="10"
                        height="10"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#0b0f14"
                        strokeWidth="4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </span>
                </button>
              );
            })}
          </div>

          <div
            className="border-t px-4 py-2.5 text-center font-mono text-[10px]"
            style={{
              borderColor: hexToCssRgb(ui.text, 0.08),
              color: ui.muted,
            }}
          >
            add a new look by dropping a .json into{" "}
            <span style={{ color: ui.accent }}>src/themes/</span>
          </div>
        </div>
      )}
    </div>
  );
}
