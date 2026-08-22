import { useEffect } from "react";
import { useUIStore } from "@/stores";

/**
 * Resolves ThemeMode ("light" | "dark" | "system") against the OS preference
 * and reflects both theme + accent onto <html> via data-attributes, which
 * src/themes/globals.css keys off of.
 */
export function useThemeSync() {
  const theme = useUIStore((s) => s.theme);
  const accent = useUIStore((s) => s.accent);
  const setResolvedTheme = useUIStore((s) => s.setResolvedTheme);

  useEffect(() => {
    const root = document.documentElement;
    const media = window.matchMedia("(prefers-color-scheme: dark)");

    const apply = () => {
      const resolved = theme === "system" ? (media.matches ? "dark" : "light") : theme;
      root.setAttribute("data-theme", resolved);
      setResolvedTheme(resolved);
    };

    apply();

    if (theme === "system") {
      media.addEventListener("change", apply);
      return () => media.removeEventListener("change", apply);
    }
  }, [theme, setResolvedTheme]);

  useEffect(() => {
    document.documentElement.setAttribute("data-accent", accent);
  }, [accent]);
}