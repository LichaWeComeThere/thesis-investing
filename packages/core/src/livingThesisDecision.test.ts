import { describe, expect, it } from 'vitest';
import {
  LIVING_THESIS_DECISION_KINDS,
  LIVING_THESIS_DECISION_RATIONALE_MAX_LENGTH,
  LIVING_THESIS_DECISION_SCHEMA_VERSION,
  LIVING_THESIS_DECISION_TITLE_MAX_LENGTH,
  parseLivingThesisDecision,
  validateLivingThesisDecision,
  type LivingThesisDecision
} from './index';

const note: LivingThesisDecision = {
  id: 'decision-1', thesisId: 'thesis-1', schemaVersion: 1, kind: 'research_note',
  title: 'Revisit customer retention', rationale: 'The latest report leaves the renewal trend unclear.',
  createdAt: '2026-09-12T12:34:56.789Z'
};

describe('Living Thesis decisions', () => {
  it('parses a detached note, normalizes prose, and preserves opaque IDs and interior formatting', () => {
    const input = Object.freeze({ ...note, id: 'legacy:decision/1', thesisId: 'legacy:thesis/1',
      title: '  Revisit customer retention \n', rationale: '\n First observation.\n\nSecond observation.  ' });
    const parsed = parseLivingThesisDecision(input);
    expect(parsed).toEqual({ ok: true, value: { ...input,
      title: 'Revisit customer retention', rationale: 'First observation.\n\nSecond observation.' } });
    if (!parsed.ok) throw new Error(parsed.errors.join(' '));
    expect(parsed.value).not.toBe(input);
    expect(input.title).toBe('  Revisit customer retention \n');
    expect(validateLivingThesisDecision(parsed.value)).toEqual({ valid: true, errors: [] });
    expect(parseLivingThesisDecision(parsed.value)).toEqual(parsed);
    expect(LIVING_THESIS_DECISION_SCHEMA_VERSION).toBe(1);
    expect(LIVING_THESIS_DECISION_KINDS).toEqual(['research_note', 'review_conclusion']);
  });

  it('requires a review link exactly for a review conclusion', () => {
    const conclusion = { ...note, kind: 'review_conclusion', reviewSessionId: 'review:legacy-1' };
    expect(parseLivingThesisDecision(conclusion)).toEqual({ ok: true, value: conclusion });
    expect(parseLivingThesisDecision({ ...note, kind: 'review_conclusion' }).ok).toBe(false);
    expect(parseLivingThesisDecision({ ...note, reviewSessionId: 'review-1' }).ok).toBe(false);
    for (const reviewSessionId of ['', '  ', null, 1, false]) {
      expect(parseLivingThesisDecision({ ...conclusion, reviewSessionId }).ok).toBe(false);
    }
    // Optional undefined fields are allowed by the surrounding storage parsers.
    expect(parseLivingThesisDecision({ ...note, reviewSessionId: undefined })).toEqual({ ok: true, value: note });
  });

  it('enforces prose limits after trimming, including exact minimum and maximum lengths', () => {
    const maximum = { ...note,
      title: 'x'.repeat(LIVING_THESIS_DECISION_TITLE_MAX_LENGTH),
      rationale: 'r'.repeat(LIVING_THESIS_DECISION_RATIONALE_MAX_LENGTH) };
    expect(parseLivingThesisDecision(maximum).ok).toBe(true);
    expect(parseLivingThesisDecision({ ...maximum, title: ` ${maximum.title} `, rationale: `\n${maximum.rationale}\n` }))
      .toEqual({ ok: true, value: maximum });
    expect(parseLivingThesisDecision({ ...note, title: 'x', rationale: 'r' }).ok).toBe(true);
    for (const title of ['', ' \t\n', `${maximum.title}x`]) {
      expect(parseLivingThesisDecision({ ...note, title }).ok).toBe(false);
    }
    for (const rationale of ['', ' \t\n', `${maximum.rationale}r`]) {
      expect(parseLivingThesisDecision({ ...note, rationale }).ok).toBe(false);
    }
  });

  it('uses canonical UTC timestamps and rejects date-only, noncanonical, and impossible dates', () => {
    for (const createdAt of ['2026-09-12', '2026-09-12T12:34:56Z', '2026-09-12T12:34:56.789+00:00',
      '2026-09-12T12:34:56.789', '2026-02-30T12:34:56.789Z', '2026-09-12T24:00:00.000Z', '', 'invalid']) {
      expect(parseLivingThesisDecision({ ...note, createdAt }).ok).toBe(false);
    }
    expect(parseLivingThesisDecision({ ...note, createdAt: '2024-02-29T00:00:00.000Z' }).ok).toBe(true);
  });

  it.each([
    ['null', null], ['undefined', undefined], ['array', []], ['string', 'decision'], ['number', 1],
    ['empty record', {}], ['future schema', { ...note, schemaVersion: 2 }],
    ['text schema', { ...note, schemaVersion: '1' }], ['missing schema', { ...note, schemaVersion: undefined }],
    ['unknown kind', { ...note, kind: 'buy' }], ['unsupported field', { ...note, extra: 'do not silently lose data' }],
    ['blank ID', { ...note, id: ' ' }], ['blank thesis ID', { ...note, thesisId: '' }],
    ['null title', { ...note, title: null }], ['number rationale', { ...note, rationale: 12 }],
    ['number ID', { ...note, id: 1 }], ['null time', { ...note, createdAt: null }]
  ])('rejects malformed %s without throwing and reports consistent validation errors', (_label, input) => {
    expect(() => parseLivingThesisDecision(input)).not.toThrow();
    const parsed = parseLivingThesisDecision(input);
    expect(parsed.ok).toBe(false);
    if (parsed.ok) throw new Error('Expected an invalid decision.');
    expect(parsed.errors.length).toBeGreaterThan(0);
    expect(validateLivingThesisDecision(input)).toEqual({ valid: false, errors: parsed.errors });
  });
});
