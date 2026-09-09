import type {
  LivingThesis,
  LivingThesisConviction,
  LivingThesisLifecycle,
  LivingThesisRiskLevel
} from '@thesis-investing/core';

import type {
  CreateLivingThesisInput,
  LivingThesisCatalystWriteInput,
  LivingThesisRiskWriteInput
} from '../../shared/livingThesesStorage';
import type { LivingThesesStorageClient } from './livingThesesStorageClient';

export type LivingThesisBoardDraft = {
  id?: string;
  version?: number;
  ticker: string;
  entityName: string;
  title: string;
  theme: string;
  summary: string;
  bullCase: string;
  bearCase: string;
  lifecycle: LivingThesisLifecycle;
  conviction: LivingThesisConviction;
  riskLevel: LivingThesisRiskLevel;
  risks: LivingThesisRiskWriteInput[];
  catalysts: LivingThesisCatalystWriteInput[];
  reviewCadenceDays: string;
  nextReviewAt: string;
};

export function thesisToDraft(thesis: LivingThesis): LivingThesisBoardDraft {
  return {
    bearCase: thesis.bearCase ?? '',
    bullCase: thesis.bullCase ?? '',
    catalysts: thesis.catalysts.map(({ id, title, detail, status }) => ({
      detail,
      id,
      status,
      title
    })),
    conviction: thesis.conviction,
    entityName: thesis.entityName,
    id: thesis.id,
    lifecycle: thesis.lifecycle,
    nextReviewAt: thesis.nextReviewAt ?? '',
    reviewCadenceDays: thesis.reviewCadenceDays?.toString() ?? '',
    riskLevel: thesis.riskLevel,
    risks: thesis.risks.map(({ id, title, detail, severity, status }) => ({
      detail,
      id,
      severity,
      status,
      title
    })),
    summary: thesis.summary,
    theme: thesis.theme ?? '',
    ticker: thesis.ticker ?? '',
    title: thesis.title,
    version: thesis.version
  };
}

export function draftToFields(
  draft: LivingThesisBoardDraft
): CreateLivingThesisInput {
  const reviewCadenceDays = draft.reviewCadenceDays.trim()
    ? Number(draft.reviewCadenceDays)
    : undefined;

  return {
    bearCase: draft.bearCase,
    bullCase: draft.bullCase,
    catalysts: draft.catalysts,
    conviction: draft.conviction,
    entityName: draft.entityName,
    lifecycle: draft.lifecycle,
    nextReviewAt: draft.nextReviewAt || undefined,
    reviewCadenceDays,
    riskLevel: draft.riskLevel,
    risks: draft.risks,
    summary: draft.summary,
    theme: draft.theme,
    ticker: draft.ticker,
    title: draft.title
  };
}

export async function saveLivingThesisDraft(
  client: LivingThesesStorageClient,
  draft: LivingThesisBoardDraft,
  isCreating: boolean
) {
  const fields = draftToFields(draft);

  if (isCreating) {
    return client.create(fields);
  }

  if (!draft.id || !draft.version) {
    return {
      code: 'validation' as const,
      errors: ['The selected Living Thesis cannot be saved.'],
      ok: false as const
    };
  }

  return client.update({ ...fields, id: draft.id }, draft.version);
}
