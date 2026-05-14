import type { LucideIcon } from 'lucide-react';
import {
  Compass,
  Gauge,
  Home,
  LayoutDashboard,
  ListChecks,
  Mail,
  PieChart,
  Settings,
  ShieldCheck,
  TrendingUp
} from 'lucide-react';

export type NavItem = {
  id: string;
  label: string;
  /** Shown under the label in the expanded rail; also used for the icon-only tooltip. */
  description: string;
  sectionId: string;
  Icon: LucideIcon;
};

/** Primary workspace navigation — each `id` maps to a full-screen view in `DashboardViews`. */
export const PRIMARY_NAV: NavItem[] = [
  {
    id: 'dashboard',
    label: 'Overview',
    description: 'Portfolio KPIs and growth pace at a glance.',
    sectionId: '__top',
    Icon: LayoutDashboard
  },
  {
    id: 'home',
    label: 'Briefing',
    description: 'Hero summary, date, and daily report actions.',
    sectionId: 'section-home',
    Icon: Home
  },
  {
    id: 'score',
    label: 'MBS Scorer',
    description: 'Manual score stock flow, KPI strip, and save actions.',
    sectionId: 'section-score',
    Icon: Gauge
  },
  {
    id: 'market',
    label: 'Market Pulse',
    description: 'Growth ring, watchlist movers, and risk alert cards.',
    sectionId: 'section-market',
    Icon: TrendingUp
  },
  {
    id: 'portfolio',
    label: 'Positions',
    description: 'Holdings table, filters, and reminder context.',
    sectionId: 'section-portfolio',
    Icon: PieChart
  },
  {
    id: 'thesis-monitor',
    label: 'Thesis desk',
    description: 'Activity feed and assigned recipients (illustrative).',
    sectionId: 'section-thesis',
    Icon: ShieldCheck
  },
  {
    id: 'watchlist',
    label: 'Watchlist',
    description: 'Tracked names, movers, and sparkline (illustrative).',
    sectionId: 'section-watchlist',
    Icon: ListChecks
  },
  {
    id: 'discover',
    label: 'Research',
    description: 'Profit view, digest, and supporting tiles (illustrative).',
    sectionId: 'section-discover',
    Icon: Compass
  },
  {
    id: 'strategy',
    label: 'Communications',
    description: 'Email preview and send styling (illustrative).',
    sectionId: 'section-strategy',
    Icon: Mail
  }
];

export const SETTINGS_ITEM: NavItem = {
  id: 'settings',
  label: 'Settings',
  description: 'Build info, disclaimer, and workspace preferences.',
  sectionId: '__settings',
  Icon: Settings
};
