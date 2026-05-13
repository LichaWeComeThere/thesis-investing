import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ManualMbsScorerScreen } from './ManualMbsScorerScreen';
import { buildManualMbsInput } from './manualMbsScorerInput';

describe('ManualMbsScorerScreen', () => {
  it('renders manual scorer copy and deterministic output for sample values', () => {
    const html = renderToStaticMarkup(
      <ManualMbsScorerScreen
        initialCategoryValues={{
          balanceSheet: '8',
          businessQuality: '8',
          growth: '8',
          management: '8',
          moat: '8',
          risk: '8',
          valuation: '8'
        }}
      />
    );

    expect(html).toContain('Manual inputs only');
    expect(html).toContain('No live data, brokerage');
    expect(html).toContain('80 / 100');
    expect(html).toContain('80%');
    expect(html).toContain('strong');
    expect(html).toContain('7 / 7');
  });

  it('renders missing and invalid criteria clearly', () => {
    const html = renderToStaticMarkup(
      <ManualMbsScorerScreen
        initialCategoryValues={{
          businessQuality: '11'
        }}
      />
    );

    expect(html).toContain('incomplete');
    expect(html).toContain('Moat');
    expect(html).toContain('Score is incomplete');
    expect(html).toContain('Business quality: businessQuality must be');
  });

  it('keeps notes out of the score input when score values are unchanged', () => {
    const categoryValues = {
      balanceSheet: '6',
      businessQuality: '6',
      growth: '6',
      management: '6',
      moat: '6',
      risk: '6',
      valuation: '6'
    };

    const withoutNotes = buildManualMbsInput(categoryValues, '');
    const withNotes = buildManualMbsInput(categoryValues, 'Context only.');

    expect({ ...withNotes, notes: undefined }).toEqual(withoutNotes);
    expect(withNotes.notes).toBe('Context only.');
  });
});
