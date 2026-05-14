import { ScoreStockWorkspace } from '../score-stock/ScoreStockWorkspace';
import { ActivityManagerCard } from '../components/dashboard/ActivityManagerCard';
import { AISummaryCard } from '../components/dashboard/AISummaryCard';
import { AnnualProfitsCard } from '../components/dashboard/AnnualProfitsCard';
import { AssignedRecipientsCard } from '../components/dashboard/AssignedRecipientsCard';
import { EmailPreviewCard } from '../components/dashboard/EmailPreviewCard';
import { GrowthRateCard } from '../components/dashboard/GrowthRateCard';
import { MainStocksChartCard } from '../components/dashboard/MainStocksChartCard';
import { ReportKpiGrid } from '../components/dashboard/ReportKpiGrid';
import { RiskAlertCard } from '../components/dashboard/RiskAlertCard';
import { ContentGrid } from '../components/layout/ContentGrid';
import { PageHeader } from '../components/layout/PageHeader';
import { Card } from '../components/ui/Card';
import { EmailReportSection } from './EmailReportSection';
import { HeroSection } from './HeroSection';
import { HoldingsTable } from './HoldingsTable';

const workspaceShell =
  'pl-bento-section relative overflow-hidden rounded-[24px] border border-pl-border bg-pl-card p-5 sm:rounded-[28px] sm:p-7';

function OverviewView(): JSX.Element {
  return (
    <section className="space-y-6 sm:space-y-7" aria-label="Overview">
      <PageHeader
        eyebrow="PulseLedger"
        title="Overview"
        description="Portfolio KPIs and growth pace. Switch modules from the left rail."
      />
      <ReportKpiGrid />
      <ContentGrid>
        <GrowthRateCard spanClass="lg:col-span-12" />
      </ContentGrid>
    </section>
  );
}

function BriefingView(): JSX.Element {
  return (
    <section className="space-y-6" aria-label="Briefing">
      <HeroSection />
    </section>
  );
}

function ScorerView(): JSX.Element {
  return (
    <section className="space-y-6 sm:space-y-7" aria-label="MBS scorer">
      <div className={workspaceShell}>
        <div
          className="pointer-events-none absolute -right-20 -top-24 h-56 w-56 rounded-full bg-pl-teal/8 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -left-16 top-1/3 h-44 w-44 rounded-full bg-pl-blue-muted blur-3xl"
          aria-hidden
        />
        <div className="relative z-10">
          <ScoreStockWorkspace />
        </div>
      </div>
      <ReportKpiGrid />
    </section>
  );
}

function MarketPulseView(): JSX.Element {
  return (
    <section className="space-y-6 sm:space-y-7" aria-label="Market pulse">
      <PageHeader
        eyebrow="Environment"
        title="Market pulse"
        description="Growth pace versus plan and concentration alerts."
      />
      <ContentGrid>
        <GrowthRateCard spanClass="lg:col-span-6" />
        <RiskAlertCard spanClass="lg:col-span-6" />
      </ContentGrid>
    </section>
  );
}

function WatchlistView(): JSX.Element {
  return (
    <section className="space-y-6 sm:space-y-7" aria-label="Watchlist">
      <PageHeader
        eyebrow="Names"
        title="Watchlist"
        description="Tracked leaders, movers, and a compact trend read."
      />
      <ContentGrid>
        <MainStocksChartCard spanClass="lg:col-span-12" />
      </ContentGrid>
    </section>
  );
}

function ResearchView(): JSX.Element {
  return (
    <section className="space-y-6 sm:space-y-7" aria-label="Research">
      <PageHeader
        eyebrow="Digest"
        title="Research"
        description="Annual profit view and AI narrative context (illustrative)."
      />
      <ContentGrid>
        <AnnualProfitsCard />
        <AISummaryCard />
      </ContentGrid>
    </section>
  );
}

function ThesisDeskView(): JSX.Element {
  return (
    <section className="space-y-6 sm:space-y-7" aria-label="Thesis desk">
      <PageHeader
        eyebrow="Workflow"
        title="Thesis desk"
        description="Activity on reports and who receives them."
      />
      <ContentGrid>
        <ActivityManagerCard />
        <AssignedRecipientsCard />
      </ContentGrid>
    </section>
  );
}

function CommunicationsView(): JSX.Element {
  return (
    <section className="space-y-6 sm:space-y-7" aria-label="Communications">
      <PageHeader
        eyebrow="Delivery"
        title="Communications"
        description="Preview client-facing copy and manage test sends."
      />
      <div className="space-y-6">
        <EmailPreviewCard />
        <EmailReportSection />
      </div>
    </section>
  );
}

function SettingsView(): JSX.Element {
  return (
    <section className="space-y-6 sm:space-y-7" aria-label="Settings">
      <PageHeader
        eyebrow="Workspace"
        title="Settings"
        description="Build context and preferences. Theme follows the control in the top bar."
      />
      <Card variant="premium" className="max-w-2xl space-y-4 p-6 sm:p-7">
        <p className="text-sm leading-relaxed text-pl-slate">
          This is a local, offline-first build. Scoring and portfolio data shown here are illustrative unless you wire
          your own sources.
        </p>
        <p className="text-xs leading-relaxed text-pl-mist">
          PulseLedger · illustrative data · offline build · no live market or mail APIs
        </p>
      </Card>
    </section>
  );
}

export type DashboardViewId = string;

export function DashboardViews({ activeId }: { activeId: DashboardViewId }): JSX.Element {
  switch (activeId) {
    case 'dashboard':
      return <OverviewView />;
    case 'home':
      return <BriefingView />;
    case 'score':
      return <ScorerView />;
    case 'market':
      return <MarketPulseView />;
    case 'portfolio':
      return (
        <section aria-label="Positions">
          <HoldingsTable />
        </section>
      );
    case 'thesis-monitor':
      return <ThesisDeskView />;
    case 'watchlist':
      return <WatchlistView />;
    case 'discover':
      return <ResearchView />;
    case 'strategy':
      return <CommunicationsView />;
    case 'settings':
      return <SettingsView />;
    default:
      return <OverviewView />;
  }
}
