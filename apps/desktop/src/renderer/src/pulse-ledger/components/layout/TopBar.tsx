import { IconMenu, IconMoon, IconSearch, IconSun } from '../../icons';
import { usePulseTheme } from '../../theme/ThemeContext';

export function TopBar({ onOpenNav }: { onOpenNav: () => void }): JSX.Element {
  const { theme, toggleTheme } = usePulseTheme();

  return (
    <header className="sticky top-0 z-20 border-b border-pl-border-divider bg-pl-header/95 px-4 py-3.5 shadow-sm backdrop-blur-md sm:px-6 sm:py-4">
      <div className="flex flex-wrap items-center gap-3 sm:gap-4">
        <button
          type="button"
          className="flex h-11 w-11 items-center justify-center rounded-2xl border border-pl-border-strong bg-pl-card text-pl-ink shadow-sm transition hover:-translate-y-0.5 hover:shadow-card lg:hidden"
          onClick={onOpenNav}
          aria-label="Open menu"
        >
          <IconMenu className="h-5 w-5" />
        </button>

        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-pl-teal-muted text-sm font-bold tracking-tight text-pl-teal-deep sm:flex lg:hidden">
            PL
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold tracking-tight text-pl-ink sm:text-base">PulseLedger</p>
            <p className="hidden text-xs text-pl-slate sm:block">
              Manual workflows · illustrative panels · local-only build
            </p>
          </div>
        </div>

        <div className="flex w-full flex-col gap-2 sm:ml-auto sm:w-auto sm:flex-row sm:items-center sm:gap-3">
          <div className="relative flex w-full min-w-[200px] max-w-xl flex-1 sm:w-72">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-pl-mist">
              <IconSearch className="h-4 w-4" />
            </span>
            <input
              type="search"
              placeholder="Search holdings, tickers, or notes…"
              className="w-full rounded-2xl border border-pl-border-strong bg-pl-card py-2.5 pl-10 pr-3 text-sm text-pl-ink shadow-sm outline-none transition-all duration-200 ease-out placeholder:text-pl-mist focus:border-pl-teal/40 focus:bg-pl-input-focus focus:ring-4 focus:ring-pl-teal/25"
              aria-label="Search"
            />
          </div>
          <button
            type="button"
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-pl-border-strong bg-pl-card px-4 py-2.5 text-sm font-semibold text-pl-ink shadow-sm transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-pl-teal/30 hover:shadow-card active:translate-y-0"
          >
            <IconSearch className="h-4 w-4 text-pl-slate" />
            Search
          </button>
        </div>

        <div className="flex w-full items-center justify-end gap-2 sm:ml-0 sm:w-auto">
          <button
            type="button"
            onClick={toggleTheme}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-pl-border-strong bg-pl-card text-pl-slate shadow-sm transition hover:-translate-y-0.5 hover:border-pl-teal/40 hover:text-pl-teal hover:shadow-card"
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? <IconSun className="h-5 w-5" /> : <IconMoon className="h-5 w-5" />}
          </button>
          <div className="flex items-center gap-2 rounded-2xl border border-pl-border-strong bg-pl-card px-3 py-2 shadow-sm">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-pl-teal-deep to-pl-green ring-2 ring-pl-profile-ring" />
            <div className="hidden text-left sm:block">
              <p className="text-xs font-semibold text-pl-ink">N. Cole</p>
              <p className="text-[11px] text-pl-slate">Admin</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
