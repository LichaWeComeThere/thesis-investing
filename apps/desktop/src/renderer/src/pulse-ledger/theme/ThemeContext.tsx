import { createContext, useCallback, useContext, useLayoutEffect, useMemo, useState, type ReactNode } from 'react';
import { applyThemeToDocument, readStoredTheme, type PulseTheme } from './pulseTheme';

/* eslint-disable react-refresh/only-export-components -- paired provider + hook */

type ThemeContextValue = {
  theme: PulseTheme;
  setTheme: (t: PulseTheme) => void;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }): JSX.Element {
  const [theme, setThemeState] = useState<PulseTheme>(() => readStoredTheme());

  useLayoutEffect(() => {
    applyThemeToDocument(theme);
  }, [theme]);

  const setTheme = useCallback((t: PulseTheme) => {
    setThemeState(t);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  const value = useMemo(
    () => ({
      theme,
      setTheme,
      toggleTheme
    }),
    [theme, setTheme, toggleTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function usePulseTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('usePulseTheme must be used within ThemeProvider');
  }
  return ctx;
}
