import type { DatabaseSync } from "node:sqlite";

export interface Migration {
  version: number;
  name: string;
  sql: string;
}

export const migrations: readonly Migration[] = [
  {
    version: 1,
    name: "initial_local_schema",
    sql: `
      CREATE TABLE IF NOT EXISTS holdings (
        id TEXT PRIMARY KEY,
        portfolio_id TEXT,
        stock_id TEXT,
        ticker TEXT NOT NULL,
        company_name TEXT,
        shares REAL NOT NULL,
        average_cost REAL,
        currency TEXT,
        thesis_note_id TEXT,
        opened_at TEXT,
        created_at TEXT,
        updated_at TEXT
      );

      CREATE TABLE IF NOT EXISTS watchlist_items (
        id TEXT PRIMARY KEY,
        ticker TEXT NOT NULL,
        company_name TEXT,
        thesis_note_id TEXT,
        tags_json TEXT NOT NULL DEFAULT '[]',
        note TEXT,
        created_at TEXT,
        updated_at TEXT
      );

      CREATE TABLE IF NOT EXISTS thesis_notes (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        body TEXT NOT NULL,
        status TEXT NOT NULL,
        ticker TEXT,
        conviction TEXT,
        created_at TEXT,
        updated_at TEXT,
        review_due_at TEXT
      );

      CREATE TABLE IF NOT EXISTS reminders (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        due_date TEXT NOT NULL,
        type TEXT NOT NULL,
        ticker TEXT,
        note TEXT,
        completed_at TEXT,
        created_at TEXT,
        updated_at TEXT
      );
    `
  },
  {
    version: 2,
    name: "add_portfolio_ranker_items",
    sql: `
      CREATE TABLE IF NOT EXISTS portfolio_ranker_items (
        id TEXT PRIMARY KEY,
        ticker TEXT NOT NULL,
        company_name TEXT,
        manual_score REAL,
        notes TEXT,
        created_at TEXT,
        updated_at TEXT
      );
    `
  },
  {
    version: 3,
    name: "add_mbs_score_snapshots",
    sql: `
      CREATE TABLE IF NOT EXISTS mbs_score_snapshots (
        id TEXT PRIMARY KEY,
        thesis_id TEXT,
        ticker TEXT,
        company_name TEXT,
        score REAL NOT NULL,
        max_score REAL NOT NULL,
        percentage REAL NOT NULL,
        rating TEXT NOT NULL,
        completed_criteria INTEGER NOT NULL,
        input_json TEXT NOT NULL,
        notes TEXT,
        created_at TEXT
      );
    `
  },
  {
    version: 4,
    name: "add_living_thesis_persistence",
    sql: `
      CREATE TABLE IF NOT EXISTS living_theses (
        id TEXT PRIMARY KEY,
        version INTEGER NOT NULL CHECK (version > 0),
        ticker TEXT,
        entity_name TEXT NOT NULL,
        title TEXT NOT NULL,
        theme TEXT,
        summary TEXT NOT NULL,
        bull_case TEXT,
        bear_case TEXT,
        lifecycle TEXT NOT NULL,
        conviction TEXT NOT NULL,
        risk_level TEXT NOT NULL,
        review_cadence_days INTEGER CHECK (
          review_cadence_days IS NULL OR review_cadence_days > 0
        ),
        next_review_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        archived_at TEXT
      );

      CREATE TABLE IF NOT EXISTS living_thesis_risks (
        id TEXT PRIMARY KEY,
        thesis_id TEXT NOT NULL,
        title TEXT NOT NULL,
        detail TEXT,
        status TEXT NOT NULL,
        severity TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (thesis_id) REFERENCES living_theses(id)
          ON UPDATE RESTRICT
          ON DELETE RESTRICT
      );

      CREATE TABLE IF NOT EXISTS living_thesis_catalysts (
        id TEXT PRIMARY KEY,
        thesis_id TEXT NOT NULL,
        title TEXT NOT NULL,
        detail TEXT,
        status TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (thesis_id) REFERENCES living_theses(id)
          ON UPDATE RESTRICT
          ON DELETE RESTRICT
      );

      CREATE INDEX IF NOT EXISTS idx_living_theses_updated
        ON living_theses(updated_at DESC, id ASC);

      CREATE INDEX IF NOT EXISTS idx_living_thesis_risks_parent
        ON living_thesis_risks(thesis_id, created_at ASC, id ASC);

      CREATE INDEX IF NOT EXISTS idx_living_thesis_catalysts_parent
        ON living_thesis_catalysts(thesis_id, created_at ASC, id ASC);
    `
  },
  {
    version: 5,
    name: "add_living_thesis_review_sessions",
    sql: `
      CREATE TABLE living_thesis_review_sessions (
        id TEXT PRIMARY KEY,
        thesis_id TEXT NOT NULL REFERENCES living_theses(id)
          ON UPDATE RESTRICT ON DELETE RESTRICT,
        schema_version INTEGER NOT NULL CHECK (schema_version = 1),
        version INTEGER NOT NULL CHECK (version > 0),
        status TEXT NOT NULL CHECK (status IN ('in_progress', 'abandoned')),
        started_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        abandoned_at TEXT,
        workflow_json TEXT NOT NULL,
        CHECK ((status = 'in_progress' AND abandoned_at IS NULL) OR
          (status = 'abandoned' AND abandoned_at = updated_at AND abandoned_at IS NOT NULL))
      );
      CREATE UNIQUE INDEX idx_one_in_progress_review_per_thesis
        ON living_thesis_review_sessions(thesis_id) WHERE status = 'in_progress';
      CREATE INDEX idx_review_sessions_parent_updated
        ON living_thesis_review_sessions(thesis_id, updated_at DESC, id ASC);
    `
  },
  {
    version: 6,
    name: "complete_reviews_with_immutable_history",
    sql: `
      ALTER TABLE living_thesis_review_sessions RENAME TO living_thesis_review_sessions_v1;
      CREATE TABLE living_thesis_review_sessions (
        id TEXT PRIMARY KEY,
        thesis_id TEXT NOT NULL REFERENCES living_theses(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
        schema_version INTEGER NOT NULL CHECK (schema_version IN (1, 2)),
        version INTEGER NOT NULL CHECK (version > 0),
        status TEXT NOT NULL CHECK (status IN ('in_progress', 'abandoned', 'completed')),
        started_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        abandoned_at TEXT,
        completed_at TEXT,
        revision_id TEXT UNIQUE,
        score_snapshot_id TEXT UNIQUE REFERENCES mbs_score_snapshots(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
        workflow_json TEXT NOT NULL,
        CHECK (
          (status = 'in_progress' AND abandoned_at IS NULL AND completed_at IS NULL AND revision_id IS NULL AND score_snapshot_id IS NULL) OR
          (status = 'abandoned' AND abandoned_at = updated_at AND abandoned_at IS NOT NULL AND completed_at IS NULL AND revision_id IS NULL AND score_snapshot_id IS NULL) OR
          (status = 'completed' AND schema_version = 2 AND abandoned_at IS NULL AND completed_at = updated_at AND completed_at IS NOT NULL AND revision_id IS NOT NULL)
        )
      );
      INSERT INTO living_thesis_review_sessions
        (id, thesis_id, schema_version, version, status, started_at, updated_at, abandoned_at, workflow_json)
        SELECT id, thesis_id, schema_version, version, status, started_at, updated_at, abandoned_at, workflow_json
        FROM living_thesis_review_sessions_v1;
      DROP TABLE living_thesis_review_sessions_v1;
      CREATE UNIQUE INDEX idx_one_in_progress_review_per_thesis
        ON living_thesis_review_sessions(thesis_id) WHERE status = 'in_progress';
      CREATE INDEX idx_review_sessions_parent_updated
        ON living_thesis_review_sessions(thesis_id, updated_at DESC, id ASC);
      CREATE TABLE living_thesis_revisions (
        id TEXT PRIMARY KEY,
        thesis_id TEXT NOT NULL REFERENCES living_theses(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
        review_session_id TEXT NOT NULL UNIQUE REFERENCES living_thesis_review_sessions(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
        schema_version INTEGER NOT NULL CHECK (schema_version = 1),
        created_at TEXT NOT NULL,
        after_version INTEGER NOT NULL CHECK (after_version > 1),
        before_json TEXT NOT NULL,
        after_json TEXT NOT NULL,
        score_snapshot_id TEXT UNIQUE REFERENCES mbs_score_snapshots(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
        UNIQUE (thesis_id, after_version)
      );
      CREATE INDEX idx_thesis_revisions_parent_created
        ON living_thesis_revisions(thesis_id, created_at DESC, id ASC);
      CREATE TRIGGER immutable_completed_review_update BEFORE UPDATE ON living_thesis_review_sessions
        WHEN OLD.status IN ('completed', 'abandoned') BEGIN
          SELECT RAISE(ABORT, 'Ended reviews are immutable');
        END;
      CREATE TRIGGER immutable_ended_review_delete BEFORE DELETE ON living_thesis_review_sessions
        WHEN OLD.status IN ('completed', 'abandoned') BEGIN
          SELECT RAISE(ABORT, 'Ended reviews are immutable');
        END;
      CREATE TRIGGER immutable_thesis_revision_update BEFORE UPDATE ON living_thesis_revisions BEGIN
        SELECT RAISE(ABORT, 'Thesis revisions are immutable');
      END;
      CREATE TRIGGER immutable_thesis_revision_delete BEFORE DELETE ON living_thesis_revisions BEGIN
        SELECT RAISE(ABORT, 'Thesis revisions are immutable');
      END;
    `
  },
  {
    version: 7,
    name: "add_immutable_thesis_decisions",
    sql: `
      CREATE TABLE living_thesis_decisions (
        id TEXT PRIMARY KEY,
        thesis_id TEXT NOT NULL REFERENCES living_theses(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
        schema_version INTEGER NOT NULL CHECK (schema_version = 1),
        kind TEXT NOT NULL CHECK (kind IN ('research_note', 'review_conclusion')),
        title TEXT NOT NULL CHECK (length(trim(title)) BETWEEN 1 AND 160),
        rationale TEXT NOT NULL CHECK (length(trim(rationale)) BETWEEN 1 AND 10000),
        review_session_id TEXT REFERENCES living_thesis_review_sessions(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
        created_at TEXT NOT NULL,
        CHECK ((kind = 'research_note' AND review_session_id IS NULL) OR
          (kind = 'review_conclusion' AND review_session_id IS NOT NULL))
      );
      CREATE INDEX idx_thesis_decisions_parent_created
        ON living_thesis_decisions(thesis_id, created_at DESC, id ASC);
      CREATE TRIGGER valid_thesis_decision_relationships BEFORE INSERT ON living_thesis_decisions BEGIN
        SELECT CASE WHEN NOT EXISTS (
          SELECT 1 FROM living_theses WHERE id = NEW.thesis_id AND created_at <= NEW.created_at
        ) THEN RAISE(ABORT, 'Decision requires its thesis and a valid date') END;
        SELECT CASE WHEN NEW.review_session_id IS NOT NULL AND NOT EXISTS (
          SELECT 1 FROM living_thesis_review_sessions WHERE id = NEW.review_session_id
            AND thesis_id = NEW.thesis_id AND status = 'completed' AND completed_at <= NEW.created_at
        ) THEN RAISE(ABORT, 'Decision requires a completed review from the same thesis') END;
      END;
      CREATE TRIGGER immutable_thesis_decision_update BEFORE UPDATE ON living_thesis_decisions BEGIN
        SELECT RAISE(ABORT, 'Saved decisions are immutable');
      END;
      CREATE TRIGGER immutable_thesis_decision_delete BEFORE DELETE ON living_thesis_decisions BEGIN
        SELECT RAISE(ABORT, 'Saved decisions are immutable');
      END;
    `
  }
];

export function runMigrations(database: DatabaseSync): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL
    );
  `);

  const appliedVersions = new Set(readAppliedVersions(database));

  for (const migration of migrations) {
    if (appliedVersions.has(migration.version)) {
      continue;
    }

    database.exec("BEGIN TRANSACTION;");
    try {
      database.exec(migration.sql);
      database
        .prepare("INSERT INTO schema_migrations (version, name) VALUES (?, ?);")
        .run(migration.version, migration.name);
      database.exec("COMMIT;");
    } catch (error) {
      database.exec("ROLLBACK;");
      throw error;
    }
  }
}

function readAppliedVersions(database: DatabaseSync): number[] {
  return database
    .prepare("SELECT version FROM schema_migrations ORDER BY version ASC;")
    .all()
    .map((row) => Number((row as { version: number }).version));
}
