import {
  normalizeLivingThesis,
  validateLivingThesis,
  type IsoTimestampString,
  type LivingThesis,
  type LivingThesisCatalyst,
  type LivingThesisRisk
} from '@thesis-investing/core';
import { randomUUID } from 'node:crypto';

import { createSqliteStorage, type SqliteStorage } from '../storage/sqlite';
import type {
  CreateLivingThesisInput,
  LivingThesisCatalystWriteInput,
  LivingThesisRiskWriteInput,
  LivingThesisStorageFailureCode,
  LivingThesisStorageResult,
  UpdateLivingThesisInput
} from '../shared/livingThesesStorage';

export type LivingThesesStorageFactory = () => Promise<SqliteStorage>;

export type LivingThesesStorageService = {
  close(): Promise<void>;
  create(
    input: CreateLivingThesisInput
  ): Promise<LivingThesisStorageResult<LivingThesis>>;
  getById(id: string): Promise<LivingThesisStorageResult<LivingThesis>>;
  list(): Promise<LivingThesisStorageResult<LivingThesis[]>>;
  update(
    input: UpdateLivingThesisInput,
    expectedVersion: number
  ): Promise<LivingThesisStorageResult<LivingThesis>>;
};

export type LivingThesesStorageServiceOptions = {
  createId?: () => string;
  now?: () => IsoTimestampString;
};

class LivingThesisInputError extends Error {}

export function createLivingThesesStorageService(
  createStorage: LivingThesesStorageFactory,
  options: LivingThesesStorageServiceOptions = {}
): LivingThesesStorageService {
  const createId = options.createId ?? randomUUID;
  const now =
    options.now ?? (() => new Date().toISOString() as IsoTimestampString);
  let storagePromise: Promise<SqliteStorage> | null = null;

  async function getStorage(): Promise<SqliteStorage> {
    storagePromise ??= createStorage().catch((error: unknown) => {
      storagePromise = null;
      throw error;
    });
    return storagePromise;
  }

  return {
    async close() {
      if (!storagePromise) {
        return;
      }

      try {
        const storage = await storagePromise;
        storage.close();
      } finally {
        storagePromise = null;
      }
    },

    async create(input) {
      return runStorageOperation(async () => {
        const timestamp = now();
        const thesisId = createId();
        const risks = input.risks.map((risk) =>
          createRisk(risk, thesisId, createId(), timestamp)
        );
        const catalysts = input.catalysts.map((catalyst) =>
          createCatalyst(catalyst, thesisId, createId(), timestamp)
        );
        const thesis = normalizeLivingThesis({
          ...toAggregateFields(input),
          archivedAt: input.lifecycle === 'archived' ? timestamp : undefined,
          catalysts,
          createdAt: timestamp,
          id: thesisId,
          risks,
          updatedAt: timestamp,
          version: 1
        });
        const validation = validateLivingThesis(thesis);

        if (!validation.valid) {
          return failure('validation', validation.errors);
        }

        const storage = await getStorage();
        return fromRepositoryResult(storage.repositories.livingTheses.create(thesis));
      });
    },

    async getById(id) {
      return runStorageOperation(async () => {
        if (!id.trim()) {
          return failure('validation', ['Living Thesis id is required.']);
        }

        const storage = await getStorage();
        const thesis = storage.repositories.livingTheses.getById(id);

        return thesis
          ? success(thesis)
          : failure('not-found', ['The Living Thesis record was not found.']);
      });
    },

    async list() {
      return runStorageOperation(async () => {
        const storage = await getStorage();
        return success(storage.repositories.livingTheses.list());
      });
    },

    async update(input, expectedVersion) {
      return runStorageOperation(async () => {
        if (!Number.isInteger(expectedVersion) || expectedVersion < 1) {
          return failure('validation', [
            'Expected version must be a positive integer.'
          ]);
        }

        const storage = await getStorage();
        const current = storage.repositories.livingTheses.getById(input.id);

        if (!current) {
          return failure('not-found', ['The Living Thesis record was not found.']);
        }

        if (current.version !== expectedVersion) {
          return failure('conflict', [
            `A newer saved version is available (version ${current.version}).`
          ]);
        }

        const timestamp = now();
        const risks = mapUpdatedRisks(
          input.risks,
          current,
          createId,
          timestamp
        );
        const catalysts = mapUpdatedCatalysts(
          input.catalysts,
          current,
          createId,
          timestamp
        );
        const thesis = normalizeLivingThesis({
          ...toAggregateFields(input),
          archivedAt:
            input.lifecycle === 'archived'
              ? (current.archivedAt ?? timestamp)
              : undefined,
          catalysts,
          createdAt: current.createdAt,
          id: current.id,
          risks,
          updatedAt: timestamp,
          version: expectedVersion
        });
        const validation = validateLivingThesis(thesis);

        if (!validation.valid) {
          return failure('validation', validation.errors);
        }

        return fromRepositoryResult(
          storage.repositories.livingTheses.update(thesis, expectedVersion)
        );
      });
    }
  };
}

export function createSqliteLivingThesesStorageService(
  filename: string
): LivingThesesStorageService {
  return createLivingThesesStorageService(() =>
    createSqliteStorage({ filename })
  );
}

function toAggregateFields(
  input: CreateLivingThesisInput | UpdateLivingThesisInput
): Pick<
  LivingThesis,
  | 'bearCase'
  | 'bullCase'
  | 'conviction'
  | 'entityName'
  | 'lifecycle'
  | 'nextReviewAt'
  | 'reviewCadenceDays'
  | 'riskLevel'
  | 'summary'
  | 'theme'
  | 'ticker'
  | 'title'
> {
  return {
    bearCase: optionalText(input.bearCase),
    bullCase: optionalText(input.bullCase),
    conviction: input.conviction,
    entityName: input.entityName,
    lifecycle: input.lifecycle,
    nextReviewAt: input.nextReviewAt || undefined,
    reviewCadenceDays: input.reviewCadenceDays,
    riskLevel: input.riskLevel,
    summary: input.summary,
    theme: optionalText(input.theme),
    ticker: optionalText(input.ticker),
    title: input.title
  };
}

function mapUpdatedRisks(
  inputs: readonly LivingThesisRiskWriteInput[],
  current: LivingThesis,
  createId: () => string,
  timestamp: IsoTimestampString
): LivingThesisRisk[] {
  const existing = new Map(current.risks.map((risk) => [risk.id, risk]));

  return inputs.map((input) => {
    if (!input.id) {
      return createRisk(input, current.id, createId(), timestamp);
    }

    const previous = existing.get(input.id);

    if (!previous) {
      throw new LivingThesisInputError(
        'An edited risk no longer belongs to this Living Thesis.'
      );
    }

    return {
      ...createRisk(input, current.id, previous.id, timestamp),
      createdAt: previous.createdAt,
      updatedAt: riskChanged(input, previous) ? timestamp : previous.updatedAt
    };
  });
}

function mapUpdatedCatalysts(
  inputs: readonly LivingThesisCatalystWriteInput[],
  current: LivingThesis,
  createId: () => string,
  timestamp: IsoTimestampString
): LivingThesisCatalyst[] {
  const existing = new Map(
    current.catalysts.map((catalyst) => [catalyst.id, catalyst])
  );

  return inputs.map((input) => {
    if (!input.id) {
      return createCatalyst(input, current.id, createId(), timestamp);
    }

    const previous = existing.get(input.id);

    if (!previous) {
      throw new LivingThesisInputError(
        'An edited catalyst no longer belongs to this Living Thesis.'
      );
    }

    return {
      ...createCatalyst(input, current.id, previous.id, timestamp),
      createdAt: previous.createdAt,
      updatedAt: catalystChanged(input, previous)
        ? timestamp
        : previous.updatedAt
    };
  });
}

function createRisk(
  input: LivingThesisRiskWriteInput,
  thesisId: string,
  id: string,
  timestamp: IsoTimestampString
): LivingThesisRisk {
  return {
    createdAt: timestamp,
    detail: optionalText(input.detail),
    id,
    severity: input.severity,
    status: input.status,
    thesisId,
    title: input.title,
    updatedAt: timestamp
  };
}

function createCatalyst(
  input: LivingThesisCatalystWriteInput,
  thesisId: string,
  id: string,
  timestamp: IsoTimestampString
): LivingThesisCatalyst {
  return {
    createdAt: timestamp,
    detail: optionalText(input.detail),
    id,
    status: input.status,
    thesisId,
    title: input.title,
    updatedAt: timestamp
  };
}

function optionalText<T extends string>(value: T | undefined): T | undefined {
  const trimmed = value?.trim();
  return trimmed ? (trimmed as T) : undefined;
}

function riskChanged(
  input: LivingThesisRiskWriteInput,
  previous: LivingThesisRisk
): boolean {
  return (
    input.title.trim() !== previous.title ||
    optionalText(input.detail) !== previous.detail ||
    input.status !== previous.status ||
    input.severity !== previous.severity
  );
}

function catalystChanged(
  input: LivingThesisCatalystWriteInput,
  previous: LivingThesisCatalyst
): boolean {
  return (
    input.title.trim() !== previous.title ||
    optionalText(input.detail) !== previous.detail ||
    input.status !== previous.status
  );
}

async function runStorageOperation<T>(
  operation: () => Promise<LivingThesisStorageResult<T>>
): Promise<LivingThesisStorageResult<T>> {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof LivingThesisInputError) {
      return failure('validation', [error.message]);
    }

    return failure('storage', [
      'Living Thesis storage is unavailable. Try again.'
    ]);
  }
}

function fromRepositoryResult<T>(
  result: { ok: true; value: T } | { ok: false; errors: string[] }
): LivingThesisStorageResult<T> {
  if (result.ok) {
    return success(result.value);
  }

  const message = result.errors.join(' ');
  let code: LivingThesisStorageFailureCode = 'validation';

  if (message.includes('version conflict')) {
    code = 'conflict';
  } else if (message.includes('already exists')) {
    code = 'duplicate';
  } else if (message.includes('was not found')) {
    code = 'not-found';
  } else if (message.startsWith('Could not')) {
    return failure('storage', [
      'Living Thesis storage is unavailable. Try again.'
    ]);
  }

  return failure(code, result.errors);
}

function success<T>(value: T): LivingThesisStorageResult<T> {
  return { ok: true, value };
}

function failure<T>(
  code: LivingThesisStorageFailureCode,
  errors: readonly string[]
): LivingThesisStorageResult<T> {
  return { code, errors, ok: false };
}
