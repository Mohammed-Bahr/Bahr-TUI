import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { themes, defaultTheme, type TuiTheme } from "./index";

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

interface TuiThemeContextValue {
  theme: TuiTheme;
  setTheme: (theme: TuiTheme) => void;
}

const TuiThemeContext = createContext<TuiThemeContextValue | null>(null);

export function TuiThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<TuiTheme>(loadInitialTheme);

  useEffect(() => {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme.id);
    } catch {
      /* ignore */
    }
  }, [theme]);

  return (
    <TuiThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </TuiThemeContext.Provider>
  );
}

export function useTuiTheme(): TuiThemeContextValue {
  const ctx = useContext(TuiThemeContext);
  if (!ctx) throw new Error("useTuiTheme must be used within TuiThemeProvider");
  return ctx;
}
