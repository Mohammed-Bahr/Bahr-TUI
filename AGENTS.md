# AGENTS.md

Tauri v2 + React 19 + Vite 7 + Tailwind v4 desktop app. The "TUI" is an in-browser xterm.js shell, not a real PTY.

## Commands

- Use **bun**, not npm. `tauri.conf.json` runs `bun run dev` / `bun run build`; `bun.lock` is canonical. `package-lock.json` is tracked but stale — do not regenerate or update it.
- `bun run dev` — Vite only (browser). Dev server is `http://localhost:1420` with `strictPort`, so no other Vite instance may use that port.
- `bun run tauri dev` — desktop app via Tauri.
- `bun run build` — `tsc && vite build`. Typecheck runs first and is strict (`strict`, `noUnusedLocals`, `noUnusedParameters`): any unused variable/param fails the build.
- No lint or test scripts exist.

## Architecture

- `src/App.tsx` — the whole TUI: xterm.js (`@xterm/xterm` v6 + `@xterm/addon-fit`) rendered in a Tailwind-styled chrome (header, settings dropdown, status bar). The shell is simulated — only built-in commands (`help`, `whoami`, `date`, `clear`) work; there is no PTY/process backend.
- `src/themes/` — theme system (see below).
- `src-tauri/src/lib.rs` — only the template `greet` command; the frontend does not call it. `main.rs` has a Windows-only `windows_subsystem` attr that must not be removed.
- `src/config/` is empty.

## Themes

- Each theme is one JSON file in `src/themes/*.json`, auto-registered by `import.meta.glob("./*.json")` in `src/themes/index.ts`. Adding a file = a new theme; no code changes needed. The glob is relative to `index.ts` — do not "fix" it to `./themes/*.json`.
- Schema is `src/themes/types.ts`: `id`, `name`, `description`, `colors` (xterm palette), `ui` (GUI chrome colors).
- Active theme is persisted in localStorage key `tui.active-theme`; the settings gear in the header switches themes at runtime.

## Gotchas

- React `StrictMode` runs effects twice in dev — the terminal init effect must (and does) dispose cleanly on cleanup.
- Tailwind v4 via `@tailwindcss/vite`; there is no `tailwind.config` file, `src/App.css` is just `@import "tailwindcss"`.
- `terax-ai/` is a gitignored vendored project (~8.6GB) — never edit, build, or commit anything in it.