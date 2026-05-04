import * as React from "react";
import { DEFAULT_THEME_ID, getTheme, Theme } from "./themes";

const STORAGE_KEY = "doscom_theme_id";

interface ThemeContextValue {
  themeId: string;
  theme: Theme;
  setThemeId: (id: string) => void;
}

const ThemeContext = React.createContext<ThemeContextValue | null>(null);

function readInitial(): string {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return saved;
  } catch {}
  return DEFAULT_THEME_ID;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeId, setThemeIdState] = React.useState<string>(readInitial);

  React.useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-theme", themeId);
    const t = getTheme(themeId);
    root.style.colorScheme = t.mode;
    try { localStorage.setItem(STORAGE_KEY, themeId); } catch {}
  }, [themeId]);

  const value = React.useMemo<ThemeContextValue>(
    () => ({ themeId, theme: getTheme(themeId), setThemeId: setThemeIdState }),
    [themeId]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = React.useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside <ThemeProvider>");
  return ctx;
}
