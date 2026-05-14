import type { RefObject, ReactNode } from 'react';
import type { NavItem } from '../../navConfig';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';

type Props = {
  navOpen: boolean;
  onNavClose: () => void;
  onNavOpen: () => void;
  activeNavId: string;
  onNavigate: (item: NavItem) => void;
  showLabels: boolean;
  scrollRef: RefObject<HTMLDivElement>;
  children: ReactNode;
};

export function AppShell({
  navOpen,
  onNavClose,
  onNavOpen,
  activeNavId,
  onNavigate,
  showLabels,
  scrollRef,
  children
}: Props): JSX.Element {
  return (
    <div className="min-h-screen bg-pl-page text-pl-ink pl-page-fade">
      <div className="mx-auto max-w-[1680px] p-3 sm:p-6 lg:p-8">
        <div className="overflow-hidden rounded-[28px] border border-pl-border bg-pl-surface shadow-shell ring-1 ring-pl-border-muted/50 transition-shadow duration-200 sm:rounded-[36px]">
          <div className="flex min-h-[calc(100vh-1.5rem)]">
            <Sidebar
              open={navOpen}
              onClose={onNavClose}
              activeNavId={activeNavId}
              onNavigate={onNavigate}
              showLabels={showLabels}
            />
            <div className="flex min-w-0 flex-1 flex-col bg-pl-canvas">
              <TopBar onOpenNav={onNavOpen} />
              <div
                ref={scrollRef}
                className="flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-11"
              >
                {children}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
