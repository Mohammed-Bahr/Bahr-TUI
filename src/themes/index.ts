import type { TuiTheme } from "./types";

const modules = import.meta.glob<{ default: TuiTheme }>("./*.json", {
  eager: true,
});

export const themes: TuiTheme[] = Object.values(modules)
  .map((m) => m.default)
  .sort((a, b) => a.name.localeCompare(b.name));

export const defaultTheme = themes.find((t) => t.id === "tui-dark") ?? themes[0];

export type { TuiTheme, TuiUiColors, XtermPalette } from "./types";