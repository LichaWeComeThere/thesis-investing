import { describe, expect, it } from 'vitest';
import {
  createBlankInvestmentIdea,
  mapMbsScoreToInvestmentIdea,
  mapPortfolioRankerItemToInvestmentIdea,
  mapThesisNoteToInvestmentIdea,
  updateInvestmentIdeaDecisionLog,
  validateInvestmentIdeaMissingFields
} from './investmentIdea';
import type { InvestmentIdea } from './domain';

describe('InvestmentIdea helpers', () => {
  it('creates a blank investment idea with stable defaults', () => {
    expect(createBlankInvestmentIdea('MSFT')).toEqual({
      id: createBlankInvestmentIdea('MSFT').id,
      ticker: '',
      watchlistStatus: 'none',
      thesisStatus: 'draft',
      decisionLog: []
    });
    expect(createBlankInvestmentIdea('MSFT').id).toBe(
      createBlankInvestmentIdea('MSFT').id
    );
  });

  it('maps MBS scorer data without calculating or changing scores', () => {
    const idea = createBlankInvestmentIdea('score-msft', {
      ticker: 'MSFT',
      notes: 'Existing note'
    });
    const mappedIdea = mapMbsScoreToInvestmentIdea(
      {
        businessQuality: 8,
        moat: 7,
        notes: 'Scoring context'
      },
      idea
    );

    expect(mappedIdea).toMatchObject({
      id: idea.id,
      ticker: 'MSFT',
      mbsScore: {
        businessQuality: 8,
        moat: 7,
        notes: 'Scoring context'
      },
      notes: 'Scoring context'
    });
    expect(mappedIdea.adjustedScore).toBeUndefined();
  });

  it('maps portfolio ranker rows into investment idea fields', () => {
    const mappedIdea = mapPortfolioRankerItemToInvestmentIdea({
      id: 'row-1',
      ticker: ' msft ',
      companyName: 'Microsoft',
      manualScore: 87,
      notes: 'Quality compounder'
    });

    expect(mappedIdea).toMatchObject({
      ticker: 'MSFT',
      companyName: 'Microsoft',
      adjustedScore: 87,
      notes: 'Quality compounder',
      watchlistStatus: 'none',
      thesisStatus: 'draft'
    });
  });

  it('maps thesis notes into thesis-oriented investment idea fields', () => {
    const mappedIdea = mapThesisNoteToInvestmentIdea({
      id: 'thesis_msft',
      title: 'Durable software thesis',
      body: 'Cloud and software durability remain the core thesis.',
      status: 'active',
      ticker: ' msft ',
      conviction: 'high',
      reviewDueAt: '2026-08-15',
      updatedAt: '2026-05-20'
    });

    expect(mappedIdea).toMatchObject({
      ticker: 'MSFT',
      conviction: 'high',
      thesisStatus: 'active',
      bullCase: 'Cloud and software durability remain the core thesis.',
      reviewDate: '2026-08-15',
      notes: 'Durable software thesis',
      updatedAt: '2026-05-20'
    });
  });

  it('validates missing and malformed investment idea fields', () => {
    const invalidIdea = {
      ...createBlankInvestmentIdea('invalid'),
      createdAt: '2026-99-01',
      decisionLog: undefined,
      ticker: 'bad ticker'
    } as unknown as InvestmentIdea;

    expect(validateInvestmentIdeaMissingFields(invalidIdea)).toEqual({
      valid: false,
      missingFields: ['decisionLog'],
      errors: [
        'Investment idea ticker must be a valid ticker symbol.',
        'Investment idea decision log is required.',
        'Investment idea created date must use YYYY-MM-DD format.'
      ]
    });
  });

  it('appends decision log entries immutably', () => {
    const idea = createBlankInvestmentIdea('decision-msft', {
      ticker: 'MSFT'
    });
    const updatedIdea = updateInvestmentIdeaDecisionLog(idea, {
      decision: 'Promote to watchlist',
      note: 'Score and thesis quality improved.',
      createdAt: '2026-05-21'
    });

    expect(idea.decisionLog).toEqual([]);
    expect(updatedIdea.decisionLog).toHaveLength(1);
    expect(updatedIdea.decisionLog[0]).toMatchObject({
      decision: 'Promote to watchlist',
      note: 'Score and thesis quality improved.',
      createdAt: '2026-05-21'
    });
    expect(updatedIdea.updatedAt).toBe('2026-05-21');
  });
});
