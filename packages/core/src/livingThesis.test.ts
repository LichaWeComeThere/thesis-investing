import { describe, expect, expectTypeOf, it } from 'vitest';
import type { ThesisStatus } from './domain';
import {
  LIVING_THESIS_LIFECYCLES,
  normalizeLivingThesis,
  validateLivingThesis,
  validateLivingThesisCatalyst,
  validateLivingThesisRisk
} from './livingThesis';
import type {
  LivingThesis,
  LivingThesisCatalyst,
  LivingThesisLifecycle,
  LivingThesisRisk
} from './livingThesis';

function createRisk(
  overrides: Partial<LivingThesisRisk> = {}
): LivingThesisRisk {
  return {
    id: 'risk_primary',
    thesisId: 'thesis_primary',
    title: 'Customer concentration',
    detail: 'Monitor renewal concentration among the largest accounts.',
    status: 'open',
    severity: 'medium',
    createdAt: '2026-08-19',
    updatedAt: '2026-08-19',
    ...overrides
  };
}

function createCatalyst(
  overrides: Partial<LivingThesisCatalyst> = {}
): LivingThesisCatalyst {
  return {
    id: 'catalyst_primary',
    thesisId: 'thesis_primary',
    title: 'New product adoption',
    detail: 'Track disclosed enterprise adoption milestones.',
    status: 'open',
    createdAt: '2026-08-19',
    updatedAt: '2026-08-19',
    ...overrides
  };
}

function createLivingThesis(
  overrides: Partial<LivingThesis> = {}
): LivingThesis {
  return {
    id: 'thesis_primary',
    version: 1,
    entityName: 'Example Research Subject',
    title: 'Durable operating model',
    summary: 'The operating model may support durable long-term economics.',
    lifecycle: 'draft',
    conviction: 'unrated',
    riskLevel: 'medium',
    risks: [createRisk()],
    catalysts: [createCatalyst()],
    reviewCadenceDays: 90,
    nextReviewAt: '2026-11-17',
    createdAt: '2026-08-19',
    updatedAt: '2026-08-19',
    ...overrides
  };
}

describe('Living Thesis shared model', () => {
  it('accepts a tickerless Living Thesis', () => {
    expect(validateLivingThesis(createLivingThesis())).toEqual({
      valid: true,
      errors: []
    });
  });

  it('allows multiple theses to share ticker metadata', () => {
    const first = createLivingThesis({ ticker: 'MSFT' });
    const second = createLivingThesis({
      id: 'thesis_alternative',
      ticker: 'MSFT',
      risks: [
        createRisk({
          id: 'risk_alternative',
          thesisId: 'thesis_alternative'
        })
      ],
      catalysts: [
        createCatalyst({
          id: 'catalyst_alternative',
          thesisId: 'thesis_alternative'
        })
      ]
    });

    expect(validateLivingThesis(first).valid).toBe(true);
    expect(validateLivingThesis(second).valid).toBe(true);
    expect(first.id).not.toBe(second.id);
    expect(first.ticker).toBe(second.ticker);
  });

  it('requires stable identity and current-state text fields', () => {
    const result = validateLivingThesis(
      createLivingThesis({
        id: ' ',
        entityName: ' ',
        title: '',
        summary: '',
        risks: [],
        catalysts: []
      })
    );

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual([
      'Living Thesis id is required.',
      'Living Thesis entity name is required.',
      'Living Thesis title is required.',
      'Living Thesis summary is required.'
    ]);
  });

  it('accepts exactly the dedicated lifecycle vocabulary', () => {
    for (const lifecycle of LIVING_THESIS_LIFECYCLES) {
      expect(
        validateLivingThesis(createLivingThesis({ lifecycle })).valid
      ).toBe(true);
    }

    for (const lifecycle of ['watch', 'challenged', 'broken', 'closed']) {
      const result = validateLivingThesis(
        createLivingThesis({
          lifecycle: lifecycle as LivingThesisLifecycle
        })
      );

      expect(result.errors).toContain(
        'Living Thesis lifecycle is not supported.'
      );
    }

    expectTypeOf<LivingThesisLifecycle>().not.toEqualTypeOf<ThesisStatus>();
  });

  it('requires a positive whole-number version', () => {
    for (const version of [0, -1, 1.5, Number.NaN]) {
      expect(validateLivingThesis(createLivingThesis({ version })).errors).toContain(
        'Living Thesis version must be a positive integer.'
      );
    }

    expect(validateLivingThesis(createLivingThesis({ version: 2 })).valid).toBe(
      true
    );
  });

  it('validates structured risks with stable identity and state', () => {
    expect(validateLivingThesisRisk(createRisk())).toEqual({
      valid: true,
      errors: []
    });

    const result = validateLivingThesisRisk(
      createRisk({
        id: '',
        title: ' ',
        status: 'unknown' as LivingThesisRisk['status'],
        severity: 'critical' as LivingThesisRisk['severity'],
        updatedAt: 'not-a-date'
      })
    );

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual([
      'id is required.',
      'title is required.',
      'status is not supported.',
      'severity is not supported.',
      'updated date must use YYYY-MM-DD format.'
    ]);
  });

  it('validates structured catalysts with stable identity and state', () => {
    expect(validateLivingThesisCatalyst(createCatalyst())).toEqual({
      valid: true,
      errors: []
    });

    const result = validateLivingThesisCatalyst(
      createCatalyst({
        thesisId: '',
        detail: ' ',
        status: 'completed' as LivingThesisCatalyst['status'],
        createdAt: '2026-02-30'
      })
    );

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual([
      'thesis id is required.',
      'detail cannot be blank when provided.',
      'status is not supported.',
      'created date must use YYYY-MM-DD format.'
    ]);
  });

  it('requires child records to reference their parent and use unique ids', () => {
    const result = validateLivingThesis(
      createLivingThesis({
        risks: [createRisk({ thesisId: 'another_thesis' })],
        catalysts: [createCatalyst({ id: 'risk_primary' })]
      })
    );

    expect(result.errors).toContain(
      'Living Thesis child risk_primary must reference its parent thesis id.'
    );
    expect(result.errors).toContain(
      'Living Thesis child id risk_primary must be unique.'
    );
  });

  it('validates review scheduling and current-state timestamps', () => {
    const result = validateLivingThesis(
      createLivingThesis({
        reviewCadenceDays: 0,
        nextReviewAt: '2026-13-01',
        archivedAt: 'yesterday'
      })
    );

    expect(result.errors).toEqual([
      'Living Thesis review cadence must be a positive whole number of days.',
      'Living Thesis next review date must use YYYY-MM-DD format.',
      'Living Thesis archived date must use YYYY-MM-DD format.'
    ]);
  });

  it('normalizes a copy without mutating the source or generating identity', () => {
    const source = createLivingThesis({
      ticker: ' msft ',
      entityName: ' Example Entity ',
      title: ' Example Thesis ',
      summary: ' Example summary ',
      risks: [createRisk({ title: ' Risk title ' })],
      catalysts: [createCatalyst({ detail: ' Catalyst detail ' })]
    });
    const normalized = normalizeLivingThesis(source);

    expect(normalized).not.toBe(source);
    expect(normalized).toMatchObject({
      id: 'thesis_primary',
      ticker: 'MSFT',
      entityName: 'Example Entity',
      title: 'Example Thesis',
      summary: 'Example summary'
    });
    expect(normalized.risks[0]?.title).toBe('Risk title');
    expect(normalized.catalysts[0]?.detail).toBe('Catalyst detail');
    expect(source.ticker).toBe(' msft ');
  });

  it('does not embed authoritative MBS, history, health, or queue state', () => {
    type ForbiddenAuthoritativeKey =
      | 'mbs'
      | 'mbsScore'
      | 'currentMbs'
      | 'previousMbs'
      | 'previousMbsScore'
      | 'scoreChange'
      | 'mbsHistory'
      | 'currentMbsSnapshotId'
      | 'reviewSessions'
      | 'decisionLog'
      | 'revisions'
      | 'timeline'
      | 'health'
      | 'healthScore'
      | 'healthStatus'
      | 'reviewPriority'
      | 'reviewQueueScore';

    expectTypeOf<
      Extract<keyof LivingThesis, ForbiddenAuthoritativeKey>
    >().toEqualTypeOf<never>();
  });
});
