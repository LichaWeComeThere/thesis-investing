import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ThesisBoardScreen } from './ThesisBoardScreen';

describe('ThesisBoardScreen', () => {
  it('renders the investment workspace with ranked theses and MBS fields', () => {
    const html = renderToStaticMarkup(<ThesisBoardScreen />);

    expect(html).toContain('Thesis Board');
    expect(html).toContain(
      'Review, rank, and update investment ideas from one focused workspace.'
    );
    expect(html).toContain('Demo thesis workspace');
    expect(html).toContain('example records and edits are not saved');
    expect(html).toContain('not yet the formal Living Thesis OS');
    expect(html).toContain('Thesis Rankings');
    expect(html).toContain('Compare Ideas');
    expect(html).toContain('NVDA');
    expect(html).toContain('NVIDIA');
    expect(html).toContain('AI Infrastructure');
    expect(html).toContain('+4');
    expect(html).toContain('Strong');
    expect(html).toContain('Active');
    expect(html).toContain('Conviction High');
    expect(html).toContain('Risk Medium');
    expect(html).toContain('Reviewed 2026-05-20');
    expect(html).toContain('Next 2026-06-12');
    expect(html).toContain('All ideas');
    expect(html).toContain('Watchlist');
    expect(html).toContain('Researching');
    expect(html).toContain('Needs Review');
    expect(html).toContain('Caution');
    expect(html).toContain('Archived');
    expect(html).toContain('Sort');
    expect(html).toContain('MBS score');
    expect(html).toContain('Score change');
    expect(html).toContain('Conviction');
    expect(html).toContain('Risk');
    expect(html).toContain('Next review date');
    expect(html).toContain('Add idea');
    expect(html).toContain('MBS score breakdown');
    expect(html).toContain('Business quality');
    expect(html).toContain('Bull case');
    expect(html).toContain('Bear case');
    expect(html).toContain('Key risks');
    expect(html).toContain('Catalysts');
    expect(html).toContain('Next review');
  });
});
