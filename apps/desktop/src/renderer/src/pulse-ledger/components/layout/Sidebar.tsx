import type { LucideIcon } from 'lucide-react';
import { PRIMARY_NAV, SETTINGS_ITEM, type NavItem } from '../../navConfig';

function SidebarRow({
  label,
  description,
  Icon,
  isActive,
  onClick,
  showLabels
}: {
  label: string;
  description: string;
  Icon: LucideIcon;
  isActive: boolean;
  onClick: () => void;
  showLabels: boolean;
}): JSX.Element {
  return (
    <button
      type="button"
      title={showLabels ? undefined : `${label} — ${description}`}
      onClick={onClick}
      className={`group flex w-full items-center gap-3 rounded-2xl py-2.5 text-left motion-safe:transition-[background,box-shadow,transform,color] motion-safe:duration-200 motion-safe:ease-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pl-teal ${
        showLabels ? 'px-2.5' : 'justify-center px-0'
      } ${
        isActive
          ? 'bg-pl-nav-active text-pl-ink shadow-[0_8px_28px_-14px_rgba(0,0,0,0.55)] ring-1 ring-pl-teal/45'
          : 'text-pl-slate hover:bg-pl-nav-hover hover:text-pl-ink hover:shadow-sm motion-safe:hover:-translate-y-px'
      }`}
    >
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border motion-safe:transition-all motion-safe:duration-200 motion-safe:ease-out ${
          isActive
            ? 'scale-100 border-pl-teal/55 bg-pl-teal/18 text-pl-teal shadow-[0_0_22px_-6px_rgba(45,212,191,0.45)] ring-1 ring-pl-teal/35'
            : 'border-pl-border-muted bg-pl-muted/40 text-pl-slate motion-safe:group-hover:scale-[1.06] motion-safe:group-hover:-translate-y-px group-hover:border-pl-teal/45 group-hover:bg-pl-teal/15 group-hover:text-pl-teal group-hover:shadow-[0_0_20px_-10px_rgba(45,212,191,0.32)]'
        }`}
      >
        <Icon
          className="h-[18px] w-[18px] motion-safe:transition-transform motion-safe:duration-200 motion-safe:ease-out motion-safe:group-hover:scale-105"
          strokeWidth={1.75}
          aria-hidden
        />
      </span>
      {showLabels ? (
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-semibold leading-tight tracking-tight text-pl-ink">
            {label}
          </span>
          <span className="mt-1 block text-[11px] font-medium leading-snug text-pl-slate line-clamp-2">
            {description}
          </span>
        </span>
      ) : null}
    </button>
  );
}

export function Sidebar({
  open,
  onClose,
  activeNavId,
  onNavigate,
  showLabels
}: {
  open: boolean;
  onClose: () => void;
  activeNavId: string;
  onNavigate: (item: NavItem) => void;
  showLabels: boolean;
}): JSX.Element {
  const railWidth = showLabels ? 'min-w-[200px] max-w-[220px] sm:min-w-[220px]' : 'w-[72px]';

  return (
    <>
      <button
        type="button"
        aria-label="Close navigation"
        className={`fixed inset-0 z-30 bg-pl-overlay backdrop-blur-[3px] transition-opacity duration-300 lg:hidden ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={onClose}
      />

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex shrink-0 flex-col border-r border-pl-border-divider bg-gradient-to-b from-pl-surface via-pl-surface to-pl-card/25 py-5 shadow-card backdrop-blur-md transition-all duration-300 ease-out lg:static lg:z-auto lg:translate-x-0 lg:shadow-none ${railWidth} ${
          open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
        aria-label="Primary navigation"
      >
        <div className={`mb-6 flex items-center gap-3 px-3 ${showLabels ? '' : 'justify-center'}`}>
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-pl-teal/20 via-pl-card to-pl-green-muted text-sm font-bold tracking-tight text-pl-teal shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] ring-1 ring-pl-border-strong">
            PL
          </div>
          {showLabels ? (
            <div className="min-w-0">
              <p className="truncate text-[11px] font-semibold uppercase tracking-wider text-pl-faint">Thesis Investing</p>
              <p className="truncate text-sm font-semibold tracking-tight text-pl-ink">PulseLedger desk</p>
            </div>
          ) : null}
        </div>

        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-2 pb-4" aria-label="App sections">
          {PRIMARY_NAV.map((item) => (
            <SidebarRow
              key={item.id}
              label={item.label}
              description={item.description}
              Icon={item.Icon}
              showLabels={showLabels}
              isActive={activeNavId === item.id}
              onClick={() => {
                onNavigate(item);
                onClose();
              }}
            />
          ))}
        </nav>

        <div className="mt-auto border-t border-pl-border-divider px-2 pt-3">
          <SidebarRow
            label={SETTINGS_ITEM.label}
            description={SETTINGS_ITEM.description}
            Icon={SETTINGS_ITEM.Icon}
            showLabels={showLabels}
            isActive={activeNavId === SETTINGS_ITEM.id}
            onClick={() => {
              onNavigate(SETTINGS_ITEM);
              onClose();
            }}
          />
        </div>
      </aside>
    </>
  );
}
