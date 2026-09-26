import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ManualMbsScorerScreen } from './ManualMbsScorerScreen';
import { buildManualMbsInput } from './manualMbsScorerInput';
import {
  cloneMockTheses,
  createMockThesisFromMbsScore,
  saveMockMbsScoreToThesis
} from './data/mockTheses';

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

    expect(html).toContain('Score a company');
    expect(html).toContain('Rate seven business factors and save your assessment.');
    expect(html).toContain('80 / 100');
    expect(html).toContain('80%');
    expect(html).toContain('Strong thesis');
    expect(html).toContain('Strongest drivers');
    expect(html).toContain('Weakest drivers');
    expect(html).toContain('Interpretation');
    expect(html).toContain('All criteria complete');
    expect(html).toContain('7 / 7');
    expect(html).toContain('Save snapshot');
  });

  it('renders beginner guided scoring by default with plain-English options', () => {
    const html = renderToStaticMarkup(
      <ManualMbsScorerScreen
        initialCategoryValues={{
          businessQuality: '7',
          risk: '10'
        }}
      />
    );

    expect(html).not.toContain('Auto-Fill');
    expect(html).toContain('Guided questions');
    expect(html).toContain('Enter ratings');
    expect(html).toContain(
      'Answer simple questions and the app converts them into 0-10 scores.'
    );
    expect(html).toContain('How durable is this business?');
    expect(html).toContain(
      'Customer value, margins, repeatability, and operating quality.'
    );
    expect(html).toContain(
      '0-3 weak | 4-6 average | 7-8 durable | 9-10 exceptional'
    );
    expect(html).toContain('Good business with stable demand');
    expect(html).toContain(
      "How strong is the company&#x27;s competitive advantage?"
    );
    expect(html).toContain('Strong brand/network/platform advantage');
    expect(html).toContain('How risky is the thesis?');
    expect(html).toContain(
      'Higher score means lower risk / better risk profile.'
    );
    expect(html).toContain(
      '0-3 high risk | 4-6 mixed | 7-8 manageable | 9-10 low-risk profile'
    );
    expect(html).toContain('Low risk / well understood');
    expect(html).toContain('Score 7 / 10');
    expect(html).toContain('Score 10 / 10');
  });

  it('identifies shared mock companies and session-only preview actions', () => {
    const html = renderToStaticMarkup(<ManualMbsScorerScreen />);

    expect(html).toContain('Example company');
    expect(html).toContain('NVDA - NVIDIA');
    expect(html).toContain('MSFT - Microsoft');
    expect(html).toContain('CRWD - CrowdStrike');
    expect(html).toContain('TSLA - Tesla');
    expect(html).toContain('AVGO - Broadcom');
    expect(html).toContain('SOFI - SoFi Technologies');
    expect(html).toContain('PLTR - Palantir');
    expect(html).toContain('AMD - Advanced Micro Devices');
    expect(html).toContain('Add a company to this preview');
    expect(html).toContain('Update example score');
    expect(html).toContain('Add preview company');
  });

  it('renders saved MBS snapshots and storage errors', () => {
    const html = renderToStaticMarkup(
      <ManualMbsScorerScreen
        initialSavedSnapshots={[
          {
            id: 'score-msft',
            ticker: 'MSFT',
            companyName: 'Microsoft',
            score: 80,
            maxScore: 100,
            percentage: 80,
            rating: 'strong',
            completedCriteria: 7,
            input: {
              businessQuality: 8,
              moat: 8,
              management: 8,
              balanceSheet: 8,
              growth: 8,
              valuation: 8,
              risk: 8
            },
            createdAt: '2026-05-24'
          }
        ]}
        initialSnapshotStorageErrors={['Snapshot storage unavailable.']}
        storageClient={null}
      />
    );

    expect(html).toContain('Saved snapshots');
    expect(html).toContain('MSFT - 2026-05-24');
    expect(html).toContain('Snapshot storage unavailable.');
  });

  it('renders session theses passed from the app shell', () => {
    const sessionThesis = createMockThesisFromMbsScore(cloneMockTheses(), {
      companyName: 'MVP Session Co',
      createdAt: '2026-05-24T12:00:00.000Z',
      mbsScore: 74,
      ticker: 'mvp'
    });
    const html = renderToStaticMarkup(
      <ManualMbsScorerScreen theses={[sessionThesis]} />
    );

    expect(html).toContain('MVP - MVP Session Co');
    expect(html).toContain('74 / 100');
  });

  it('renders deterministic thesis interpretation and score drivers', () => {
    const html = renderToStaticMarkup(
      <ManualMbsScorerScreen
        initialCategoryValues={{
          balanceSheet: '6',
          businessQuality: '9',
          growth: '8',
          management: '7',
          moat: '8',
          risk: '6',
          valuation: '5'
        }}
      />
    );

    expect(html).toContain('Strong but expensive');
    expect(html).toContain('Business quality');
    expect(html).toContain('Moat');
    expect(html).toContain('Valuation');
    expect(html).toContain('High-quality thesis, but valuation may limit upside.');
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

  it('updates mock thesis score in frontend state helpers', () => {
    const theses = cloneMockTheses();
    const updatedTheses = saveMockMbsScoreToThesis(
      theses,
      'thesis-crwd',
      78,
      '2026-05-24T12:00:00.000Z'
    );
    const updatedCrwd = updatedTheses.find(
      (thesis) => thesis.id === 'thesis-crwd'
    );

    expect(updatedCrwd?.mbsScore).toBe(78);
    expect(updatedCrwd?.previousMbsScore).toBe(65);
    expect(updatedCrwd?.decisionLog.at(-1)?.createdAt).toBe(
      '2026-05-24T12:00:00.000Z'
    );
    expect(updatedCrwd?.decisionLog.at(-1)?.note).toBe(
      'MBS score updated from 65 to 78.'
    );
    expect(theses.find((thesis) => thesis.id === 'thesis-crwd')?.mbsScore).toBe(
      65
    );
  });

  it('creates a mock thesis from the current score with safe defaults', () => {
    const thesis = createMockThesisFromMbsScore(cloneMockTheses(), {
      createdAt: '2026-05-24T12:00:00.000Z',
      mbsScore: 74,
      notes: 'Local thesis note.',
      riskScore: 6,
      ticker: 'xyz'
    });

    expect(thesis).toMatchObject({
      companyName: 'New thesis',
      conviction: 'Unrated',
      ideaStatus: 'Researching',
      mbsScore: 74,
      previousMbsScore: 74,
      riskLevel: 'Medium',
      theme: 'Uncategorized',
      thesisStatus: 'Stable',
      ticker: 'XYZ'
    });
    expect(thesis.decisionLog[0].note).toBe('Thesis created from MBS Scorer.');
  });
});
