# TUI — Project Overview (Day 1)

A Tauri v2 desktop app that renders a custom, in-app terminal UI (xterm.js) inside a frameless window with a custom title bar. The terminal is **simulated** — there is no real PTY/process backend; only built-in commands work.

---

## 1. Tech Stack

| Layer      | Technology                                      |
| ---------- | ----------------------------------------------- |
| Desktop    | Tauri v2 (Rust backend, frameless window)       |
| Frontend   | React 19 + TypeScript (strict mode)             |
| Build tool | Vite 7                                          |
| Styling    | Tailwind CSS v4 (`@tailwindcss/vite`, no config file) |
| Terminal   | `@xterm/xterm` v6 + `@xterm/addon-fit`          |
| Icons      | Inline SVGs (no icon library used in live code) |
| Package mgr| **bun** (not npm)                               |

### Commands

- `bun run dev` — Vite dev server only (browser), port **1420** (strict).
- `bun run tauri dev` — full desktop app.
- `bun run build` — `tsc && vite build`. Typecheck runs first and is strict: any unused variable/param fails the build.
- No lint or test scripts exist.

---

## 2. Current Feature Set (what the app can do right now)

1. **Frameless window** with a fully custom top bar:
   - Drag-to-move the window from empty areas of the bar (`data-tauri-drag-region`).
   - Window controls: minimize / maximize / close (real Tauri window APIs, permissions granted in capabilities).
   - **Terminal toggle button** — opens/closes the terminal as a right sidebar panel.
   - **Settings gear** — opens a theme picker dropdown listing all themes found in `src/themes/*.json`.
2. **Theme system**:
   - Themes are plain JSON files; adding a file to `src/themes/` = a new theme automatically (no code changes). Selection persists via `localStorage` key `tui.active-theme`.
   - Theming affects both the xterm palette and all app chrome colors.
3. **Terminal panel**:
   - Appears/disappears as a **resizable right sidebar** (drag its left edge to resize between 180px and nearly the full window width; double-click the edge resets to default 420px).
   - Auto-refits on window resize and while dragging (ResizeObserver).
   - Simulated shell with built-in commands: `help`, `whoami`, `date`, `clear`.
4. **Main workspace area**: currently just a placeholder gradient background with a hint message.

---

## 3. Project Structure

```
TUI/
├── Readme-Day1.md              ← this file
├── AGENTS.md                   ← conventions for AI coding agents
├── package.json / bun.lock     ← deps & scripts (bun.lock is canonical)
├── vite.config.ts              ← Vite + React + Tailwind plugins
├── tsconfig.json               ← strict TS config
├── index.html                  ← Vite entry HTML
├── src/                        ← ALL frontend code
│   ├── main.tsx                ← React entry point (StrictMode)
│   ├── App.tsx                 ← Root layout: top bar + workspace + terminal sidebar
│   ├── App.css                 ← imports tailwindcss + themes/globals.css
│   ├── components/
│   │   ├── ButtonsBar.tsx      ← custom title bar (drag, window buttons, toggle, settings)
│   │   ├── ThemeSettings.tsx   ← settings gear + theme picker dropdown
│   │   └── terminal.tsx        ← xterm.js simulated shell
│   ├── lib/
│   │   └── color.ts            ← hex → ANSI/CSS color helpers
│   └── themes/                 ← theme system
│       ├── index.ts            ← auto-registers every *.json here
│       ├── types.ts            ← theme schema types
│       ├── ThemeContext.tsx    ← React context for active theme (+ persistence)
│       ├── globals.css         ← Tailwind @theme tokens (surface/accent vars)
│       └── *.json              ← 8 themes (tui-dark is the default)
└── src-tauri/                  ← Rust/desktop side
    ├── src/main.rs             ← binary entry (Windows-only attr — do not remove)
    ├── src/lib.rs              ← template `greet` command (unused by frontend)
    ├── tauri.conf.json         ← window config (decorations: false, 800×600)
    └── capabilities/default.json ← Tauri v2 permission grants
```

---

## 4. File-by-File Responsibility

### Frontend

#### `src/main.tsx`
Entry point. Mounts `<App />` into `#root` wrapped in React `StrictMode`. StrictMode double-runs effects in dev — components must dispose cleanly (the terminal does).

#### `src/App.tsx`
The root layout component, wrapped in `TuiThemeProvider`. Contains the `Workspace` component which owns two pieces of state:
- `terminalOpen` (boolean) — whether the sidebar is shown.
- `terminalWidth` (number) — sidebar width in px.

Renders, top to bottom:
1. `ButtonsBar` (gets `terminalOpen` + toggle callback).
2. A flex row containing:
   - `<main>` — placeholder workspace with radial-gradient glow using theme accent colors.
   - Resize handle (only when terminal is open) — pointer-event based drag that recomputes width as `startWidth − deltaX` (dragging left widens the panel). Clamped to `[180, window.innerWidth − 80]`. Sets `cursor: col-resize` during drag. Double-click resets to 420px.
   - `<aside>` — the terminal sidebar, renders `<Terminal />`.

#### `src/components/ButtonsBar.tsx`
Custom title bar replacing the native one (window has `decorations: false`). Responsibilities:
- **Window dragging** — has `data-tauri-drag-region`; child divs also carry it so dragging works from anywhere except directly on buttons. Requires restarting `tauri dev` after capability changes.
- **Window control buttons** — call real Tauri APIs via `getCurrentWindow()` (`minimize`, `toggleMaximize`, `close`). These need the window permissions in `capabilities/default.json` (see §5).
- **Terminal toggle button** — calls `onToggleTerminal` prop.
- **Settings gear** — renders `<ThemeSettings />`.
- Styled entirely from the active theme's `ui` colors.

#### `src/components/ThemeSettings.tsx`
The settings gear button and its dropdown popup. Responsibilities:
- Gear toggles an absolutely-positioned dropdown listing every registered theme.
- Each row shows color swatches (6 base + 6 bright xterm colors), name, description, and a checkmark for the active theme.
- Selecting a theme calls `setTheme` from the context (which persists it) and closes the menu.
- Closes when clicking outside (document-level `mousedown` listener).
- Footer hints that dropping a `.json` into `src/themes/` adds a new look.

#### `src/components/terminal.tsx`
The simulated terminal. Responsibilities:
- Creates one `@xterm/xterm` `Terminal` instance + `FitAddon` on mount (single effect, no deps); disposes everything on cleanup (StrictMode-safe).
- Prints ASCII-art boot banner and prompt using theme accent ANSI colors.
- Simulated line editing: Enter runs command, Backspace deletes. Built-in commands:
  - `help` — list commands
  - `whoami` — fun response
  - `date` — current date/time
  - `clear` — clear screen
  - anything else → "command not found"
- **Refit logic**: listens to `window.resize` AND observes its own container with a `ResizeObserver` — this is what makes the text reflow correctly while you drag the sidebar wider/narrower.
- Applies theme changes live: updates `term.options.theme` whenever the context theme changes.

#### `src/lib/color.ts`
Two pure helpers shared across components:
- `hexToRgb(hex)` → `"r;g;b"` string for embedding colors in xterm ANSI escape sequences.
- `hexToCssRgb(hex, alpha)` → `rgba(...)` string for CSS styling with opacity.

#### `src/themes/index.ts`
Auto-registration. Uses `import.meta.glob("./*.json", { eager: true })` to load every JSON in `themes/`, sorts by name, exports `themes[]` and `defaultTheme` (`id === "tui-dark"` fallback first theme). **The glob path is relative to this file — do not "fix" it to `./themes/*.json`.**

#### `src/themes/types.ts`
TypeScript schema for a theme:
- `id`, `name`, `description`
- `colors` — full xterm palette (background, foreground, cursor, selection, 16 ANSI colors).
- `ui` — chrome colors: `background`, `surface`, `border`, `accent`, `accentSoft`, `accent2`, `accent2Soft`, `text`, `muted`.

#### `src/themes/ThemeContext.tsx`
React context providing `{ theme, setTheme }` to the whole tree. Loads the saved theme from `localStorage` (`tui.active-theme`) on mount and writes it back on every change. Exposes:
- `TuiThemeProvider` — wraps the app in `App.tsx`.
- `useTuiTheme()` — hook; throws if used outside the provider.

#### `src/themes/globals.css`
Tailwind v4 `@theme` token definitions mapping CSS variables (`--surface-*`, `--accent`, etc.) to Tailwind utility names (e.g. `bg-surface-hover`, `bg-accent/40` — used by the resize handle). Imported via `App.css`.

#### `src/themes/*.json` (8 files)
`tui-dark` (default), plus catppuccin, dracula, gruvbox, nord, one-dark, solarized, tokyo-night. One file = one theme; no code changes needed to add more.

### Backend / Desktop (`src-tauri/`)

#### `src-tauri/src/main.rs`
Standard Tauri binary entry point. Has a Windows-only `windows_subsystem` attribute — **must not be removed**.

#### `src-tauri/src/lib.rs`
Contains only the template `greet` command. The frontend never calls it. Reserved for future Rust-side features (e.g., a real PTY).

#### `src-tauri/tauri.conf.json`
- Window: title "tui", 800×600, **`decorations: false`** (this is why we render our own top bar).
- Build: dev server at `http://localhost:1420` (strictPort), frontend dist at `../dist`.

#### `src-tauri/capabilities/default.json`
Tauri v2 permission grants for the `main` window:
- `core:default` — baseline.
- `core:window:allow-minimize`, `core:window:allow-toggle-maximize`, `core:window:allow-close` — **required** for the top-bar window buttons; `core:default` alone does NOT include these (this was the original "buttons don't work" bug).
- `opener:default` — opener plugin default.

---

## 5. Key Gotchas & Decisions Log

1. **Drag region mechanics**: `data-tauri-drag-region` only fires when mousedown lands on the element *carrying* the attribute — children covering the parent silently break dragging. Fix was adding the attribute to children / making decorative children `pointer-events-none`.
2. **Tauri v2 capabilities are opt-in per-API**: window minimize/maximize/close fail silently without explicit `core:window:allow-*` grants.
3. **StrictMode double-mount**: terminal effect must dispose term, listeners, and ResizeObserver on cleanup (it does).
4. **Tailwind v4 has no config file**; tokens come from `globals.css` `@theme` block.
5. **bun only**: `package-lock.json` is tracked but stale — never regenerate/update it.
6. **Port 1420 is strict** — no second Vite instance allowed.
7. **No real PTY yet** — the shell is a frontend simulation. Wiring a real shell would mean a Rust-side PTY process + Tauri events/commands, likely added in `lib.rs`.

---

## 6. Suggested Next Steps

- Real PTY-backed shell (portable-pty crate + Tauri commands/events).
- Tabs/panes system in the workspace area.
- Persist terminal open state & width (like the theme does).
- Keyboard shortcut to toggle the terminal (e.g. Ctrl+`).
