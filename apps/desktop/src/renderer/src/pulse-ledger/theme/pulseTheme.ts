export type PulseTheme = 'dark' | 'light';

const STORAGE_KEY = 'pulseledger-theme';

export function readStoredTheme(): PulseTheme {
  if (typeof window === 'undefined') return 'dark';
  const v = window.localStorage.getItem(STORAGE_KEY);
  return v === 'light' || v === 'dark' ? v : 'dark';
}

export function applyThemeToDocument(theme: PulseTheme): void {
  if (typeof document === 'undefined') return;
  document.documentElement.dataset.theme = theme;
  window.localStorage.setItem(STORAGE_KEY, theme);
}

/** Call before React mounts to avoid a light flash when dark is stored/default. */
export function initPulseThemeFromStorage(): void {
  applyThemeToDocument(readStoredTheme());
}
