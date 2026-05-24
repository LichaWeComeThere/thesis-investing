import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ThemeBasketsScreen } from './ThemeBasketsScreen';
import {
  STATIC_THEME_BASKETS,
  getStaticThemeBasketById
} from './themeBasketData';

describe('STATIC_THEME_BASKETS', () => {
  it('defines static educational baskets with example companies', () => {
    expect(STATIC_THEME_BASKETS).toHaveLength(8);

    for (const basket of STATIC_THEME_BASKETS) {
      expect(basket.id).toMatch(/^theme_/);
      expect(basket.name.length).toBeGreaterThan(0);
      expect(basket.description.length).toBeGreaterThan(0);
      expect(basket.educationalRationale.length).toBeGreaterThan(0);
      expect(basket.examples.length).toBeGreaterThan(0);
      expect(basket.tags.length).toBeGreaterThan(0);
      expect(basket.tickers.length).toBeGreaterThan(0);
      expect(basket.isStatic).toBe(true);
      expect(basket.nonAdvisoryNote).toContain(
        'not a personalized recommendation'
      );
    }
  });

  it('finds a basket by id', () => {
    expect(getStaticThemeBasketById('theme_cybersecurity')?.name).toBe(
      'Cybersecurity'
    );
  });
});

describe('ThemeBasketsScreen', () => {
  it('renders the theme library copy', () => {
    const html = renderToStaticMarkup(<ThemeBasketsScreen />);

    expect(html).toContain('Theme Baskets');
    expect(html).toContain('Theme Library');
    expect(html).toContain('Browse curated research themes');
    expect(html).toContain('Why it matters');
  });

  it('renders selected basket details', () => {
    const html = renderToStaticMarkup(
      <ThemeBasketsScreen initialSelectedBasketId="theme_semiconductors" />
    );

    expect(html).toContain('Semiconductors');
    expect(html).toContain('Taiwan Semiconductor Manufacturing');
    expect(html).toContain('ASML');
    expect(html).toContain('semiconductor value chain');
  });
});
