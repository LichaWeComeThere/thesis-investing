import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { DashboardScreen } from './DashboardScreen';

describe('DashboardScreen', () => {
  it('renders the local MVP overview cards', () => {
    const html = renderToStaticMarkup(<DashboardScreen />);

    expect(html).toContain('Dashboard');
    expect(html).toContain('Manual MBS Scorer');
    expect(html).toContain('Portfolio Ranker');
    expect(html).toContain('Thesis Monitor');
    expect(html).toContain('Watchlist');
    expect(html).toContain('Theme Baskets');
    expect(html).toContain('Reminders');
  });

  it('renders static, non-advisory limitation copy', () => {
    const html = renderToStaticMarkup(<DashboardScreen />);

    expect(html).toContain('static and local');
    expect(html).toContain('No live prices');
    expect(html).toContain('stock APIs');
    expect(html).toContain('brokerage import');
    expect(html).toContain('AI summaries');
    expect(html).toContain('personalized financial advice');
  });

  it('renders read-only summary metrics', () => {
    const html = renderToStaticMarkup(<DashboardScreen />);

    expect(html).toContain('Manual workflows available');
    expect(html).toContain('Live data integrations');
    expect(html).toContain('Brokerage connections');
    expect(html).toContain('Pending MVP areas');
    expect(html).toContain('<strong>6</strong>');
    expect(html).toContain('<strong>1</strong>');
    expect(html).toContain('Manual reminders');
    expect(html).toContain('Built');
  });

  it('renders the static latest market pulse feed', () => {
    const html = renderToStaticMarkup(<DashboardScreen />);

    expect(html).toContain('Latest');
    expect(html).toContain('Demo feed');
    expect(html).toContain(
      'Google, Blackstone to create new AI cloud company, WSJ reports'
    );
    expect(html).toContain("Japan&#x27;s economy grew more than expected in Q1");
    expect(html).toContain(
      'Semiconductor leaders continue showing relative strength'
    );
  });
});
