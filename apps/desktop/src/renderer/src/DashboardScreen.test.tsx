import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { DashboardScreen } from './DashboardScreen';

describe('DashboardScreen', () => {
  it('renders investor command center sections', () => {
    const html = renderToStaticMarkup(<DashboardScreen />);

    expect(html).toContain('Investor Command Center');
    expect(html).toContain('Thesis Health Overview');
    expect(html).toContain('Review Priority');
    expect(html).toContain('Market Regime');
    expect(html).toContain('Recent Thesis Activity');
    expect(html).toContain('Continue Research');
  });

  it('renders thesis health and priority demo data', () => {
    const html = renderToStaticMarkup(<DashboardScreen />);

    expect(html).toContain('Theses tracked');
    expect(html).toContain('Strong conviction');
    expect(html).toContain('Needs review');
    expect(html).toContain('Weakening');
    expect(html).toContain('Weakest Idea');
    expect(html).toContain('TSLA');
    expect(html).toContain('Biggest Score Drop');
    expect(html).toContain('TSLA');
    expect(html).toContain('Top Improving Idea');
    expect(html).toContain('NVDA');
    expect(html).toContain('Review Due Soon');
    expect(html).toContain('SOFI');
  });

  it('renders market regime and quick actions', () => {
    const html = renderToStaticMarkup(<DashboardScreen />);

    expect(html).toContain('Under Pressure');
    expect(html).toContain('Growth stocks need caution.');
    expect(html).toContain('Open MBS Scorer');
    expect(html).toContain('Review Portfolio Ranker');
    expect(html).toContain('Open Thesis Monitor');
    expect(html).toContain('Check Watchlist');
  });

  it('renders the latest market pulse feed', () => {
    const html = renderToStaticMarkup(<DashboardScreen />);

    expect(html).toContain('Latest');
    expect(html).toContain('Curated');
    expect(html).toContain(
      'Google, Blackstone to create new AI cloud company, WSJ reports'
    );
    expect(html).toContain("Japan&#x27;s economy grew more than expected in Q1");
    expect(html).toContain(
      'Semiconductor leaders continue showing relative strength'
    );
  });

  it('does not render development status dashboard copy', () => {
    const html = renderToStaticMarkup(<DashboardScreen />);

    expect(html).not.toContain('Offline MVP snapshot');
    expect(html).not.toContain('Live data integrations');
    expect(html).not.toContain('Brokerage connections');
    expect(html).not.toContain('Pending MVP areas');
    expect(html).not.toContain('MVP readiness checklist');
    expect(html).not.toContain('Use this dashboard for');
    expect(html).not.toContain('Manual workflows available');
  });
});
