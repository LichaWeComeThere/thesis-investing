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
    expect(html).toContain('Ranked theses');
    expect(html).toContain('NVDA');
    expect(html).toContain('NVIDIA');
    expect(html).toContain('MBS score breakdown');
    expect(html).toContain('Business quality');
    expect(html).toContain('Bull case');
    expect(html).toContain('Bear case');
    expect(html).toContain('Key risks');
    expect(html).toContain('Catalysts');
    expect(html).toContain('Next review');
  });
});
