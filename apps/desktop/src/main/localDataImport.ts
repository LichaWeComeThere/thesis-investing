import {
  validateLivingThesis,
  validateLivingThesisCatalyst,
  validateLivingThesisRisk,
  validateMbsScoreSnapshot,
  validatePortfolioRankerItem,
  validateReminder,
  validateThesisNote,
  validateWatchlistItem,
  type ValidationResult
} from '@thesis-investing/core';

import {
  LOCAL_DATA_EXPORT_FORMAT,
  LOCAL_DATA_EXPORT_FORMAT_VERSION,
  type LocalDataExportCounts,
  type LocalDataImportDocument,
  type LocalDataImportFormatVersion,
  type LocalDataStorageResult
} from '../shared/localDataStorage';
import type { RepositoryResult } from '../storage/repositories';
import type { SqliteStorage } from '../storage/sqlite';

const COUNT_KEYS: Array<keyof LocalDataExportCounts> = [
  'watchlistItems',
  'thesisNotes',
  'reminders',
  'portfolioRankerItems',
  'mbsScoreSnapshots',
  'livingTheses'
];

export function parseLocalDataImportDocument(
  contents: string
): LocalDataStorageResult<LocalDataImportDocument> {
  let parsed: unknown;

  try {
    parsed = JSON.parse(contents);
  } catch {
    return failure(['The selected file is not valid JSON.']);
  }

  if (!isRecord(parsed)) {
    return failure(['The selected file must contain a JSON object.']);
  }

  if (parsed.format !== LOCAL_DATA_EXPORT_FORMAT) {
    return failure([
      'The selected file is not a Thesis Investing local data export.'
    ]);
  }

  if (parsed.formatVersion !== 1 && parsed.formatVersion !== LOCAL_DATA_EXPORT_FORMAT_VERSION) {
    return failure([
      `Unsupported local data export format version: ${String(
        parsed.formatVersion
      )}.`
    ]);
  }

  const errors = validateExportMetadata(parsed);
  const countKeys = COUNT_KEYS.filter(
    (key) => parsed.formatVersion !== 1 || key !== 'livingTheses'
  );

  if (!isRecord(parsed.counts)) {
    errors.push('Export counts must be an object.');
  } else {
    for (const key of countKeys) {
      if (!isNonNegativeInteger(parsed.counts[key])) {
        errors.push(`Export count ${key} must be a non-negative integer.`);
      }
    }
  }

  if (!isRecord(parsed.data)) {
    errors.push('Export data must be an object.');
  } else {
    validateDataArrays(parsed.data, parsed.formatVersion, errors);
  }

  const counts = parsed.counts;
  const data = parsed.data;

  if (
    isRecord(counts) &&
    isRecord(data) &&
    countKeys.every((key) => Array.isArray(data[key]))
  ) {
    for (const key of countKeys) {
      if (counts[key] !== (data[key] as unknown[]).length) {
        errors.push(`Export count ${key} does not match its data array.`);
      }
    }
  }

  if (parsed.formatVersion === 1 &&
    ((isRecord(counts) && 'livingTheses' in counts) ||
      (isRecord(data) && 'livingTheses' in data))) {
    errors.push('Living Theses require export format version 2.');
  }

  if (errors.length > 0) {
    return failure(errors);
  }

  const document = parsed as unknown as LocalDataImportDocument;
  if (document.formatVersion === 1) {
    return success({
      ...document,
      counts: { ...document.counts, livingTheses: 0 },
      data: { ...document.data, livingTheses: [] }
    });
  }

  const childIds = new Set<string>();
  for (const thesis of document.data.livingTheses) {
    for (const child of [...thesis.risks, ...thesis.catalysts]) {
      if (childIds.has(child.id)) {
        errors.push(`Living Thesis child ID ${child.id} must be unique across all risks and catalysts in the backup.`);
      }
      childIds.add(child.id);
    }
  }

  return errors.length > 0 ? failure(errors) : success(document);
}

export function getLocalDataImportWarnings(
  storage: SqliteStorage,
  document: LocalDataImportDocument
): string[] {
  const totalRecords = COUNT_KEYS.reduce(
    (total, key) => total + document.counts[key],
    0
  );
  const collisionCount =
    countCollisions(
      document.data.watchlistItems,
      storage.repositories.watchlistItems.getById
    ) +
    countCollisions(
      document.data.thesisNotes,
      storage.repositories.thesisNotes.getById
    ) +
    countCollisions(
      document.data.reminders,
      storage.repositories.reminders.getById
    ) +
    countCollisions(
      document.data.portfolioRankerItems,
      storage.repositories.portfolioRankerItems.getById
    ) +
    countCollisions(
      document.data.mbsScoreSnapshots,
      storage.repositories.mbsScoreSnapshots.getById
    ) +
    countCollisions(
      document.data.livingTheses,
      storage.repositories.livingTheses.getById
    );
  const warnings: string[] = [];

  if (document.formatVersion === 1) {
    warnings.push('This older backup does not include Living Theses. Existing Living Theses on this computer will remain unchanged.');
  }

  if (totalRecords === 0) {
    warnings.push('This export contains no persisted records to import.');
  }

  if (collisionCount > 0) {
    warnings.push(
      `${collisionCount} imported record ID${collisionCount === 1 ? '' : 's'} already exist and will be remapped. Existing records will not be changed.`
    );
  }

  const existingChildIds = new Set(
    storage.repositories.livingTheses.list().flatMap(
      (thesis) => [...thesis.risks, ...thesis.catalysts].map(({ id }) => id)
    )
  );
  const childCollisions = document.data.livingTheses.flatMap(
    (thesis) => [...thesis.risks, ...thesis.catalysts]
  ).filter(({ id }) => existingChildIds.has(id)).length;
  if (childCollisions > 0) {
    warnings.push(`${childCollisions} imported risk/catalyst ID${childCollisions === 1 ? '' : 's'} already exist and will be remapped with their parent links preserved.`);
  }

  return warnings;
}

export function appendLocalDataImport(
  storage: SqliteStorage,
  document: LocalDataImportDocument
): LocalDataExportCounts {
  return storage.runInTransaction(() => {
    const thesisIds = allocateImportIds(
      document.data.thesisNotes,
      storage.repositories.thesisNotes.list().map(({ id }) => id)
    );
    const watchlistIds = allocateImportIds(
      document.data.watchlistItems,
      storage.repositories.watchlistItems.list().map(({ id }) => id)
    );
    const reminderIds = allocateImportIds(
      document.data.reminders,
      storage.repositories.reminders.list().map(({ id }) => id)
    );
    const portfolioRankerIds = allocateImportIds(
      document.data.portfolioRankerItems,
      storage.repositories.portfolioRankerItems.list().map(({ id }) => id)
    );
    const mbsSnapshotIds = allocateImportIds(
      document.data.mbsScoreSnapshots,
      storage.repositories.mbsScoreSnapshots.list().map(({ id }) => id)
    );
    const existingLivingTheses = storage.repositories.livingTheses.list();
    const livingThesisIds = allocateImportIds(
      document.data.livingTheses,
      existingLivingTheses.map(({ id }) => id)
    );
    const livingChildIds = allocateImportIds(
      document.data.livingTheses.flatMap(
        (thesis) => [...thesis.risks, ...thesis.catalysts]
      ),
      existingLivingTheses.flatMap(
        (thesis) => [...thesis.risks, ...thesis.catalysts].map(({ id }) => id)
      )
    );

    for (const note of document.data.thesisNotes) {
      requireCreated(
        storage.repositories.thesisNotes.create({
          ...note,
          id: thesisIds.get(note.id) ?? note.id
        }),
        'thesis note'
      );
    }

    for (const item of document.data.watchlistItems) {
      requireCreated(
        storage.repositories.watchlistItems.create({
          ...item,
          id: watchlistIds.get(item.id) ?? item.id,
          thesisNoteId: remapReference(item.thesisNoteId, thesisIds)
        }),
        'watchlist item'
      );
    }

    for (const reminder of document.data.reminders) {
      requireCreated(
        storage.repositories.reminders.create({
          ...reminder,
          id: reminderIds.get(reminder.id) ?? reminder.id
        }),
        'reminder'
      );
    }

    for (const item of document.data.portfolioRankerItems) {
      requireCreated(
        storage.repositories.portfolioRankerItems.create({
          ...item,
          id: portfolioRankerIds.get(item.id) ?? item.id
        }),
        'portfolio ranker item'
      );
    }

    for (const snapshot of document.data.mbsScoreSnapshots) {
      requireCreated(
        storage.repositories.mbsScoreSnapshots.create({
          ...snapshot,
          id: mbsSnapshotIds.get(snapshot.id) ?? snapshot.id,
          thesisId: remapReference(snapshot.thesisId, thesisIds)
        }),
        'MBS score snapshot'
      );
    }

    for (const thesis of document.data.livingTheses) {
      const thesisId = livingThesisIds.get(thesis.id) ?? thesis.id;
      requireCreated(
        storage.repositories.livingTheses.restore({
          ...thesis,
          id: thesisId,
          risks: thesis.risks.map((risk) => ({
            ...risk,
            id: livingChildIds.get(risk.id) ?? risk.id,
            thesisId
          })),
          catalysts: thesis.catalysts.map((catalyst) => ({
            ...catalyst,
            id: livingChildIds.get(catalyst.id) ?? catalyst.id,
            thesisId
          }))
        }),
        'Living Thesis'
      );
    }
    return { ...document.counts };
  });
}

function validateExportMetadata(value: Record<string, unknown>): string[] {
  const errors: string[] = [];

  if (value.appName !== 'Thesis Investing') {
    errors.push('Export app name must be Thesis Investing.');
  }

  if (
    typeof value.exportedAt !== 'string' ||
    Number.isNaN(Date.parse(value.exportedAt))
  ) {
    errors.push('Export timestamp must be a valid date and time.');
  }

  if (value.storageAdapter !== 'node:sqlite') {
    errors.push('Export storage adapter is not supported.');
  }

  if (value.appVersion !== undefined && typeof value.appVersion !== 'string') {
    errors.push('Export app version must be text when provided.');
  }

  return errors;
}

function validateDataArrays(
  data: Record<string, unknown>,
  formatVersion: LocalDataImportFormatVersion,
  errors: string[]
): void {
  validateRecordArray(
    data.watchlistItems,
    'watchlistItems',
    validateWatchlistShape,
    validateWatchlistItem,
    errors
  );
  validateRecordArray(
    data.thesisNotes,
    'thesisNotes',
    validateThesisNoteShape,
    validateThesisNote,
    errors
  );
  validateRecordArray(
    data.reminders,
    'reminders',
    validateReminderShape,
    validateReminder,
    errors
  );
  validateRecordArray(
    data.portfolioRankerItems,
    'portfolioRankerItems',
    validatePortfolioRankerShape,
    validatePortfolioRankerItem,
    errors
  );
  validateRecordArray(
    data.mbsScoreSnapshots,
    'mbsScoreSnapshots',
    validateMbsSnapshotShape,
    validateMbsScoreSnapshot,
    errors
  );
  if (formatVersion === LOCAL_DATA_EXPORT_FORMAT_VERSION) {
    validateRecordArray(
      data.livingTheses,
      'livingTheses',
      validateLivingThesisShape,
      validateLivingThesis,
      errors
    );
  }
}

function validateLivingThesisShape(record: Record<string, unknown>): string[] {
  const errors = validateFields(record, {
    requiredStrings: [
      'id', 'entityName', 'title', 'summary', 'lifecycle', 'conviction',
      'riskLevel', 'createdAt', 'updatedAt'
    ],
    optionalStrings: [
      'ticker', 'theme', 'bullCase', 'bearCase', 'nextReviewAt', 'archivedAt'
    ],
    requiredNumbers: ['version'],
    optionalNumbers: ['reviewCadenceDays']
  });
  validateRecordArray(
    record.risks,
    'risks',
    (risk) => validateFields(risk, {
      requiredStrings: [
        'id', 'thesisId', 'title', 'status', 'severity', 'createdAt', 'updatedAt'
      ],
      optionalStrings: ['detail']
    }),
    validateLivingThesisRisk,
    errors
  );
  validateRecordArray(
    record.catalysts,
    'catalysts',
    (catalyst) => validateFields(catalyst, {
      requiredStrings: ['id', 'thesisId', 'title', 'status', 'createdAt', 'updatedAt'],
      optionalStrings: ['detail']
    }),
    validateLivingThesisCatalyst,
    errors
  );
  return errors;
}

function validateRecordArray<T extends { id: string }>(
  value: unknown,
  label: string,
  validateShape: (record: Record<string, unknown>) => string[],
  validateDomain: (record: T) => ValidationResult,
  errors: string[]
): void {
  if (!Array.isArray(value)) {
    errors.push(`Export data ${label} must be an array.`);
    return;
  }

  const ids = new Set<string>();

  value.forEach((record, index) => {
    if (!isRecord(record)) {
      errors.push(`${label}[${index}] must be an object.`);
      return;
    }

    const recordErrors = validateShape(record);

    if (recordErrors.length === 0) {
      const typedRecord = record as T;
      const validation = validateDomain(typedRecord);
      recordErrors.push(...validation.errors);

      if (ids.has(typedRecord.id)) {
        recordErrors.push('Record ID must be unique within its data array.');
      }
      ids.add(typedRecord.id);
    }

    errors.push(...recordErrors.map((error) => `${label}[${index}]: ${error}`));
  });
}

function validateWatchlistShape(record: Record<string, unknown>): string[] {
  return validateFields(record, {
    requiredStrings: ['id', 'ticker'],
    optionalStrings: [
      'companyName',
      'thesisNoteId',
      'note',
      'createdAt'
    ],
    optionalStringArrays: ['tags']
  });
}

function validateThesisNoteShape(record: Record<string, unknown>): string[] {
  const errors = validateFields(record, {
    requiredStrings: ['id', 'title', 'body', 'status'],
    optionalStrings: [
      'ticker',
      'conviction',
      'createdAt',
      'updatedAt',
      'reviewDueAt'
    ]
  });

  if (
    record.conviction !== undefined &&
    !['low', 'medium', 'high'].includes(String(record.conviction))
  ) {
    errors.push('Thesis note conviction is not supported.');
  }

  return errors;
}

function validateReminderShape(record: Record<string, unknown>): string[] {
  return validateFields(record, {
    requiredStrings: ['id', 'title', 'dueDate', 'type'],
    optionalStrings: ['ticker', 'note', 'completedAt', 'createdAt']
  });
}

function validatePortfolioRankerShape(
  record: Record<string, unknown>
): string[] {
  return validateFields(record, {
    requiredStrings: ['id', 'ticker'],
    optionalStrings: ['companyName', 'notes', 'createdAt', 'updatedAt'],
    optionalNumbers: ['manualScore']
  });
}

function validateMbsSnapshotShape(record: Record<string, unknown>): string[] {
  const errors = validateFields(record, {
    requiredNumbers: [
      'score',
      'maxScore',
      'percentage',
      'completedCriteria'
    ],
    requiredStrings: ['id', 'rating'],
    optionalStrings: [
      'thesisId',
      'ticker',
      'companyName',
      'notes',
      'createdAt'
    ]
  });

  if (!isRecord(record.input)) {
    errors.push('MBS snapshot input must be an object.');
  } else if (
    record.input.notes !== undefined &&
    typeof record.input.notes !== 'string'
  ) {
    errors.push('MBS snapshot input notes must be text when provided.');
  }

  return errors;
}

type FieldValidationOptions = {
  optionalNumbers?: string[];
  optionalStringArrays?: string[];
  optionalStrings?: string[];
  requiredNumbers?: string[];
  requiredStrings?: string[];
};

function validateFields(
  record: Record<string, unknown>,
  {
    optionalNumbers = [],
    optionalStringArrays = [],
    optionalStrings = [],
    requiredNumbers = [],
    requiredStrings = []
  }: FieldValidationOptions
): string[] {
  const errors: string[] = [];

  for (const key of requiredStrings) {
    if (typeof record[key] !== 'string' || record[key].trim().length === 0) {
      errors.push(`${key} must be non-empty text.`);
    }
  }

  for (const key of optionalStrings) {
    if (record[key] !== undefined && typeof record[key] !== 'string') {
      errors.push(`${key} must be text when provided.`);
    }
  }

  for (const key of requiredNumbers) {
    if (typeof record[key] !== 'number' || !Number.isFinite(record[key])) {
      errors.push(`${key} must be a finite number.`);
    }
  }

  for (const key of optionalNumbers) {
    if (
      record[key] !== undefined &&
      (typeof record[key] !== 'number' || !Number.isFinite(record[key]))
    ) {
      errors.push(`${key} must be a finite number when provided.`);
    }
  }

  for (const key of optionalStringArrays) {
    if (
      record[key] !== undefined &&
      (!Array.isArray(record[key]) ||
        !record[key].every((item) => typeof item === 'string'))
    ) {
      errors.push(`${key} must be an array of text values when provided.`);
    }
  }

  return errors;
}

function allocateImportIds<T extends { id: string }>(
  records: T[],
  existingIds: string[]
): Map<string, string> {
  const existing = new Set(existingIds);
  // Reserve free IDs from the backup before allocating suffixes for collisions.
  const usedIds = new Set([...existingIds, ...records.map(({ id }) => id)]);
  const importedIds = new Map<string, string>();

  for (const record of records) {
    let id = record.id;
    let suffix = 1;

    if (!existing.has(id)) {
      importedIds.set(id, id);
      continue;
    }

    while (usedIds.has(id)) {
      id = `${record.id}-import-${suffix}`;
      suffix += 1;
    }

    importedIds.set(record.id, id);
    usedIds.add(id);
  }

  return importedIds;
}

function remapReference(
  id: string | undefined,
  importedIds: Map<string, string>
): string | undefined {
  return id ? importedIds.get(id) ?? id : undefined;
}

function countCollisions<T extends { id: string }>(
  records: T[],
  getById: (id: string) => T | undefined
): number {
  return records.filter(({ id }) => getById(id) !== undefined).length;
}

function requireCreated<T>(
  result: RepositoryResult<T>,
  recordLabel: string
): void {
  if (!result.ok) {
    throw new Error(`Unable to import ${recordLabel}: ${result.errors.join(' ')}`);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

function success<T>(value: T): LocalDataStorageResult<T> {
  return { ok: true, value };
}

function failure<T>(errors: string[]): LocalDataStorageResult<T> {
  return { ok: false, errors };
}
