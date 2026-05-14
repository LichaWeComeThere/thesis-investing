import { useCallback, useEffect, useRef, useState } from 'react';
import { AppShell } from './components/layout/AppShell';
import { DashboardViews } from './sections/DashboardViews';
import { ThemeProvider } from './theme/ThemeContext';
import type { NavItem } from './navConfig';

function useWideNav(): boolean {
  const [wide, setWide] = useState(true);
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const update = (): void => setWide(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  return wide;
}

export function PulseLedgerDashboard(): JSX.Element {
  const [navOpen, setNavOpen] = useState(false);
  const [activeNavId, setActiveNavId] = useState('dashboard');
  const scrollRef = useRef<HTMLDivElement>(null);
  const wide = useWideNav();
  const showLabels = wide || navOpen;

  const navigateTo = useCallback((item: NavItem) => {
    setActiveNavId(item.id);
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: 'auto' });
  }, [activeNavId]);

  return (
    <ThemeProvider>
      <AppShell
        navOpen={navOpen}
        onNavClose={() => setNavOpen(false)}
        onNavOpen={() => setNavOpen(true)}
        activeNavId={activeNavId}
        onNavigate={navigateTo}
        showLabels={showLabels}
        scrollRef={scrollRef}
      >
        <div key={activeNavId} className="pl-view-enter">
          <DashboardViews activeId={activeNavId} />
        </div>
      </AppShell>
    </ThemeProvider>
  );
}
