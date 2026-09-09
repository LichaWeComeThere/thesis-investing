import { readStoredReviewChildReferences, reviewChildOwnershipErrors } from './reviewSessionIntegrity';
import type { DatabaseSync } from "node:sqlite";

import {
  normalizeLivingThesis,
  validateLivingThesis,
  getLivingThesisChildReferences,
  type LivingThesis,
  type LivingThesisCatalyst,
  type LivingThesisRisk
} from "@thesis-investing/core";

import type {
  LivingThesisRepository,
  RepositoryResult
} from "./repositories";

type SqlParam = string | number | null;
type SqlRow = Record<string, unknown>;
type ChildTable = "living_thesis_risks" | "living_thesis_catalysts";

class LivingThesisRepositoryError extends Error {}

export function createSqliteLivingThesisRepository(
  database: DatabaseSync
): LivingThesisRepository {
  return {
    create(thesis) {
      const normalized = normalizeLivingThesis(thesis);
      const validation = validateLivingThesis(normalized);

      if (!validation.valid) {
        return failure(validation.errors);
      }

      if (normalized.version !== 1) {
        return failure(["A new Living Thesis must start at version 1."]);
      }

      return runTransaction(database, "create Living Thesis", () => {
        return insertAggregate(database, normalized);
      });
    },

    restore(thesis) {
      const normalized = normalizeLivingThesis(thesis);
      const validation = validateLivingThesis(normalized);

      if (!validation.valid) {
        return failure(validation.errors);
      }

      // A savepoint keeps this aggregate atomic without committing the enclosing
      // backup import. Unlike create(), restore preserves a saved version > 1.
      return runTransaction(database, "restore Living Thesis", () => {
        return insertAggregate(database, normalized);
      }, true);
    },

    getById(id) {
      return readAggregate(database, id);
    },

    list() {
      return database
        .prepare(
          `
            SELECT id
            FROM living_theses
            ORDER BY updated_at DESC, id ASC;
          `
        )
        .all()
        .map((row) =>
          readRequiredAggregate(database, requiredString(row as SqlRow, "id"))
        );
    },

    update(thesis, expectedVersion) {
      const normalized = normalizeLivingThesis(thesis);

      if (!Number.isInteger(expectedVersion) || expectedVersion < 1) {
        return failure([
          "Living Thesis expected version must be a positive integer."
        ]);
      }

      if (normalized.version !== expectedVersion) {
        return failure([
          "Living Thesis version must match the expected version before update."
        ]);
      }

      const updated: LivingThesis = {
        ...normalized,
        version: expectedVersion + 1
      };
      const validation = validateLivingThesis(updated);

      if (!validation.valid) {
        return failure(validation.errors);
      }

      return runTransaction(database, "update Living Thesis", () => {
        const current = readAggregate(database, normalized.id);

        if (!current) {
          throw new LivingThesisRepositoryError(
            `Living Thesis ${normalized.id} was not found.`
          );
        }

        if (current.version !== expectedVersion) {
          throw new LivingThesisRepositoryError(
            `Living Thesis version conflict: expected ${expectedVersion}, found ${current.version}.`
          );
        }

        if (updated.createdAt !== current.createdAt) {
          throw new LivingThesisRepositoryError(
            "Living Thesis created timestamp cannot be changed."
          );
        }

        assertExistingChildrenRetained(current, updated);
        assertReviewChildOwnership(database, updated);
        updateParent(database, updated, expectedVersion);
        updated.risks.forEach((risk) => upsertRisk(database, risk));
        updated.catalysts.forEach((catalyst) =>
          upsertCatalyst(database, catalyst)
        );

        return readRequiredAggregate(database, updated.id);
      });
    }
  };
}

function insertAggregate(database: DatabaseSync, thesis: LivingThesis): LivingThesis {
  if (readParentRow(database, thesis.id)) {
    throw new LivingThesisRepositoryError(
      `Living Thesis ${thesis.id} already exists.`
    );
  }

  assertChildIdsAvailableForCreate(database, thesis);
  assertReviewChildOwnership(database, thesis);
  insertParent(database, thesis);
  thesis.risks.forEach((risk) => insertRisk(database, risk));
  thesis.catalysts.forEach((catalyst) =>
    insertCatalyst(database, catalyst)
  );

  return readRequiredAggregate(database, thesis.id);
}

function runTransaction<T>(
  database: DatabaseSync,
  operationName: string,
  operation: () => T,
  useSavepoint = false
): RepositoryResult<T> {
  let transactionStarted = false;

  try {
    database.exec(useSavepoint ? "SAVEPOINT living_thesis_restore;" : "BEGIN IMMEDIATE;");
    transactionStarted = true;
    const value = operation();
    database.exec(useSavepoint ? "RELEASE living_thesis_restore;" : "COMMIT;");
    return success(value);
  } catch (error) {
    if (transactionStarted) {
      database.exec(useSavepoint
        ? "ROLLBACK TO living_thesis_restore; RELEASE living_thesis_restore;"
        : "ROLLBACK;");
    }

    const message =
      error instanceof LivingThesisRepositoryError
        ? error.message
        : `Could not ${operationName}.`;

    return failure([message]);
  }
}

function insertParent(database: DatabaseSync, thesis: LivingThesis): void {
  database
    .prepare(
      `
        INSERT INTO living_theses (
          id,
          version,
          ticker,
          entity_name,
          title,
          theme,
          summary,
          bull_case,
          bear_case,
          lifecycle,
          conviction,
          risk_level,
          review_cadence_days,
          next_review_at,
          created_at,
          updated_at,
          archived_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
      `
    )
    .run(...parentParams(thesis));
}

function updateParent(
  database: DatabaseSync,
  thesis: LivingThesis,
  expectedVersion: number
): void {
  const result = database
    .prepare(
      `
        UPDATE living_theses
        SET
          version = ?,
          ticker = ?,
          entity_name = ?,
          title = ?,
          theme = ?,
          summary = ?,
          bull_case = ?,
          bear_case = ?,
          lifecycle = ?,
          conviction = ?,
          risk_level = ?,
          review_cadence_days = ?,
          next_review_at = ?,
          updated_at = ?,
          archived_at = ?
        WHERE id = ? AND version = ?;
      `
    )
    .run(
      thesis.version,
      thesis.ticker ?? null,
      thesis.entityName,
      thesis.title,
      thesis.theme ?? null,
      thesis.summary,
      thesis.bullCase ?? null,
      thesis.bearCase ?? null,
      thesis.lifecycle,
      thesis.conviction,
      thesis.riskLevel,
      thesis.reviewCadenceDays ?? null,
      thesis.nextReviewAt ?? null,
      thesis.updatedAt,
      thesis.archivedAt ?? null,
      thesis.id,
      expectedVersion
    );

  if (Number(result.changes) !== 1) {
    throw new LivingThesisRepositoryError(
      `Living Thesis version conflict for ${thesis.id}.`
    );
  }
}

function parentParams(thesis: LivingThesis): SqlParam[] {
  return [
    thesis.id,
    thesis.version,
    thesis.ticker ?? null,
    thesis.entityName,
    thesis.title,
    thesis.theme ?? null,
    thesis.summary,
    thesis.bullCase ?? null,
    thesis.bearCase ?? null,
    thesis.lifecycle,
    thesis.conviction,
    thesis.riskLevel,
    thesis.reviewCadenceDays ?? null,
    thesis.nextReviewAt ?? null,
    thesis.createdAt,
    thesis.updatedAt,
    thesis.archivedAt ?? null
  ];
}

function insertRisk(database: DatabaseSync, risk: LivingThesisRisk): void {
  database
    .prepare(
      `
        INSERT INTO living_thesis_risks (
          id,
          thesis_id,
          title,
          detail,
          status,
          severity,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?);
      `
    )
    .run(
      risk.id,
      risk.thesisId,
      risk.title,
      risk.detail ?? null,
      risk.status,
      risk.severity,
      risk.createdAt,
      risk.updatedAt
    );
}

function insertCatalyst(
  database: DatabaseSync,
  catalyst: LivingThesisCatalyst
): void {
  database
    .prepare(
      `
        INSERT INTO living_thesis_catalysts (
          id,
          thesis_id,
          title,
          detail,
          status,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?);
      `
    )
    .run(
      catalyst.id,
      catalyst.thesisId,
      catalyst.title,
      catalyst.detail ?? null,
      catalyst.status,
      catalyst.createdAt,
      catalyst.updatedAt
    );
}

function upsertRisk(database: DatabaseSync, risk: LivingThesisRisk): void {
  const riskOwner = readChildOwner(database, "living_thesis_risks", risk.id);
  const catalystOwner = readChildOwner(
    database,
    "living_thesis_catalysts",
    risk.id
  );

  if (catalystOwner) {
    throw new LivingThesisRepositoryError(
      `Living Thesis child id ${risk.id} is already used by a catalyst.`
    );
  }

  if (!riskOwner) {
    insertRisk(database, risk);
    return;
  }

  if (riskOwner.thesisId !== risk.thesisId) {
    throw new LivingThesisRepositoryError(
      `Living Thesis risk ${risk.id} belongs to another thesis.`
    );
  }

  if (riskOwner.createdAt !== risk.createdAt) {
    throw new LivingThesisRepositoryError(
      `Living Thesis risk ${risk.id} created timestamp cannot be changed.`
    );
  }

  database
    .prepare(
      `
        UPDATE living_thesis_risks
        SET title = ?, detail = ?, status = ?, severity = ?, updated_at = ?
        WHERE id = ? AND thesis_id = ?;
      `
    )
    .run(
      risk.title,
      risk.detail ?? null,
      risk.status,
      risk.severity,
      risk.updatedAt,
      risk.id,
      risk.thesisId
    );
}

function upsertCatalyst(
  database: DatabaseSync,
  catalyst: LivingThesisCatalyst
): void {
  const catalystOwner = readChildOwner(
    database,
    "living_thesis_catalysts",
    catalyst.id
  );
  const riskOwner = readChildOwner(
    database,
    "living_thesis_risks",
    catalyst.id
  );

  if (riskOwner) {
    throw new LivingThesisRepositoryError(
      `Living Thesis child id ${catalyst.id} is already used by a risk.`
    );
  }

  if (!catalystOwner) {
    insertCatalyst(database, catalyst);
    return;
  }

  if (catalystOwner.thesisId !== catalyst.thesisId) {
    throw new LivingThesisRepositoryError(
      `Living Thesis catalyst ${catalyst.id} belongs to another thesis.`
    );
  }

  if (catalystOwner.createdAt !== catalyst.createdAt) {
    throw new LivingThesisRepositoryError(
      `Living Thesis catalyst ${catalyst.id} created timestamp cannot be changed.`
    );
  }

  database
    .prepare(
      `
        UPDATE living_thesis_catalysts
        SET title = ?, detail = ?, status = ?, updated_at = ?
        WHERE id = ? AND thesis_id = ?;
      `
    )
    .run(
      catalyst.title,
      catalyst.detail ?? null,
      catalyst.status,
      catalyst.updatedAt,
      catalyst.id,
      catalyst.thesisId
    );
}

function assertExistingChildrenRetained(
  current: LivingThesis,
  updated: LivingThesis
): void {
  const riskIds = new Set(updated.risks.map((risk) => risk.id));
  const catalystIds = new Set(
    updated.catalysts.map((catalyst) => catalyst.id)
  );

  for (const risk of current.risks) {
    if (!riskIds.has(risk.id)) {
      throw new LivingThesisRepositoryError(
        `Living Thesis risk ${risk.id} must be retained or marked retired.`
      );
    }
  }

  for (const catalyst of current.catalysts) {
    if (!catalystIds.has(catalyst.id)) {
      throw new LivingThesisRepositoryError(
        `Living Thesis catalyst ${catalyst.id} must be retained or marked retired.`
      );
    }
  }
}

function assertChildIdsAvailableForCreate(
  database: DatabaseSync,
  thesis: LivingThesis
): void {
  for (const child of [...thesis.risks, ...thesis.catalysts]) {
    const riskOwner = readChildOwner(
      database,
      "living_thesis_risks",
      child.id
    );
    const catalystOwner = readChildOwner(
      database,
      "living_thesis_catalysts",
      child.id
    );

    if (riskOwner || catalystOwner) {
      throw new LivingThesisRepositoryError(
        `Living Thesis child id ${child.id} already exists.`
      );
    }
  }
}

function readAggregate(
  database: DatabaseSync,
  id: string
): LivingThesis | undefined {
  const row = readParentRow(database, id);

  if (!row) {
    return undefined;
  }

  const thesis = mapLivingThesis(
    row,
    readRisks(database, id),
    readCatalysts(database, id)
  );
  const validation = validateLivingThesis(thesis);

  if (!validation.valid) {
    throw new LivingThesisRepositoryError(
      `Stored Living Thesis ${id} is invalid: ${validation.errors.join("; ")}`
    );
  }

  return thesis;
}

function readRequiredAggregate(database: DatabaseSync, id: string): LivingThesis {
  const thesis = readAggregate(database, id);

  if (!thesis) {
    throw new LivingThesisRepositoryError(`Living Thesis ${id} was not found.`);
  }

  return thesis;
}

function readParentRow(database: DatabaseSync, id: string): SqlRow | undefined {
  return database
    .prepare("SELECT * FROM living_theses WHERE id = ?;")
    .get(id) as SqlRow | undefined;
}

function readRisks(database: DatabaseSync, thesisId: string): LivingThesisRisk[] {
  return database
    .prepare(
      `
        SELECT *
        FROM living_thesis_risks
        WHERE thesis_id = ?
        ORDER BY created_at ASC, id ASC;
      `
    )
    .all(thesisId)
    .map((row) => mapRisk(row as SqlRow));
}

function readCatalysts(
  database: DatabaseSync,
  thesisId: string
): LivingThesisCatalyst[] {
  return database
    .prepare(
      `
        SELECT *
        FROM living_thesis_catalysts
        WHERE thesis_id = ?
        ORDER BY created_at ASC, id ASC;
      `
    )
    .all(thesisId)
    .map((row) => mapCatalyst(row as SqlRow));
}

function mapLivingThesis(
  row: SqlRow,
  risks: LivingThesisRisk[],
  catalysts: LivingThesisCatalyst[]
): LivingThesis {
  const ticker = optionalString(row, "ticker");
  const theme = optionalString(row, "theme");
  const bullCase = optionalString(row, "bull_case");
  const bearCase = optionalString(row, "bear_case");
  const reviewCadenceDays = optionalNumber(row, "review_cadence_days");
  const nextReviewAt = optionalString(row, "next_review_at");
  const archivedAt = optionalString(row, "archived_at");

  return {
    id: requiredString(row, "id"),
    version: requiredNumber(row, "version"),
    ...(ticker !== undefined ? { ticker } : {}),
    entityName: requiredString(row, "entity_name"),
    title: requiredString(row, "title"),
    ...(theme !== undefined ? { theme } : {}),
    summary: requiredString(row, "summary"),
    ...(bullCase !== undefined ? { bullCase } : {}),
    ...(bearCase !== undefined ? { bearCase } : {}),
    lifecycle: requiredString(row, "lifecycle") as LivingThesis["lifecycle"],
    conviction: requiredString(row, "conviction") as LivingThesis["conviction"],
    riskLevel: requiredString(row, "risk_level") as LivingThesis["riskLevel"],
    risks,
    catalysts,
    ...(reviewCadenceDays !== undefined ? { reviewCadenceDays } : {}),
    ...(nextReviewAt !== undefined ? { nextReviewAt } : {}),
    createdAt: requiredString(row, "created_at"),
    updatedAt: requiredString(row, "updated_at"),
    ...(archivedAt !== undefined ? { archivedAt } : {})
  };
}

function mapRisk(row: SqlRow): LivingThesisRisk {
  const detail = optionalString(row, "detail");

  return {
    id: requiredString(row, "id"),
    thesisId: requiredString(row, "thesis_id"),
    title: requiredString(row, "title"),
    ...(detail !== undefined ? { detail } : {}),
    status: requiredString(row, "status") as LivingThesisRisk["status"],
    severity: requiredString(row, "severity") as LivingThesisRisk["severity"],
    createdAt: requiredString(row, "created_at"),
    updatedAt: requiredString(row, "updated_at")
  };
}

function mapCatalyst(row: SqlRow): LivingThesisCatalyst {
  const detail = optionalString(row, "detail");

  return {
    id: requiredString(row, "id"),
    thesisId: requiredString(row, "thesis_id"),
    title: requiredString(row, "title"),
    ...(detail !== undefined ? { detail } : {}),
    status: requiredString(row, "status") as LivingThesisCatalyst["status"],
    createdAt: requiredString(row, "created_at"),
    updatedAt: requiredString(row, "updated_at")
  };
}

function readChildOwner(
  database: DatabaseSync,
  table: ChildTable,
  id: string
): { thesisId: string; createdAt: string } | undefined {
  const row = database
    .prepare(`SELECT thesis_id, created_at FROM ${table} WHERE id = ?;`)
    .get(id) as SqlRow | undefined;

  return row
    ? {
        thesisId: requiredString(row, "thesis_id"),
        createdAt: requiredString(row, "created_at")
      }
    : undefined;
}

function requiredString(row: SqlRow, key: string): string {
  const value = row[key];

  if (typeof value !== "string") {
    throw new LivingThesisRepositoryError(
      `Stored Living Thesis field ${key} must be text.`
    );
  }

  return value;
}

function optionalString(row: SqlRow, key: string): string | undefined {
  const value = row[key];

  if (value === null || value === undefined) {
    return undefined;
  }

  return requiredString(row, key);
}

function requiredNumber(row: SqlRow, key: string): number {
  const value = row[key];

  if (typeof value !== "number") {
    throw new LivingThesisRepositoryError(
      `Stored Living Thesis field ${key} must be numeric.`
    );
  }

  return value;
}

function optionalNumber(row: SqlRow, key: string): number | undefined {
  const value = row[key];

  if (value === null || value === undefined) {
    return undefined;
  }

  return requiredNumber(row, key);
}

function success<T>(value: T): RepositoryResult<T> {
  return { ok: true, value };
}

function failure<T>(errors: string[]): RepositoryResult<T> {
  return { ok: false, errors };
}

function assertReviewChildOwnership(database: DatabaseSync, thesis: LivingThesis): void {
  const errors = reviewChildOwnershipErrors([
    ...readStoredReviewChildReferences(database), ...getLivingThesisChildReferences(thesis)
  ]);
  if (errors.length) throw new LivingThesisRepositoryError(errors.join(' '));
}
