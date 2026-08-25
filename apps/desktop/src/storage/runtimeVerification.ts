import type { LivingThesis, WatchlistItem } from "@thesis-investing/core";

import { createSqliteStorage, type SqliteStorage } from "./sqlite";

export interface StorageRuntimeVerificationSuccess {
  ok: true;
  adapter: "node:sqlite";
  database: "memory";
  usesUserData: false;
  steps: string[];
}

export interface StorageRuntimeVerificationFailure {
  ok: false;
  adapter: "node:sqlite";
  database: "memory";
  usesUserData: false;
  steps: string[];
  error: string;
}

export type StorageRuntimeVerificationResult =
  | StorageRuntimeVerificationSuccess
  | StorageRuntimeVerificationFailure;

export interface StorageRuntimeVerificationOptions {
  createStorage?: () => Promise<SqliteStorage>;
}

const verificationItem: WatchlistItem = {
  id: "storage-runtime-verification-watchlist-item",
  ticker: "msft",
  companyName: "Runtime Storage Verification",
  tags: ["runtime", "verification"],
  note: "Temporary in-memory record used to verify the storage adapter."
};

const verificationThesis: LivingThesis = {
  id: "storage-runtime-verification-living-thesis",
  version: 1,
  entityName: "Runtime Storage Verification",
  title: "Verify Living Thesis persistence",
  summary: "Temporary in-memory aggregate used to verify Stage 3 storage.",
  lifecycle: "active",
  conviction: "medium",
  riskLevel: "medium",
  risks: [
    {
      id: "storage-runtime-verification-risk",
      thesisId: "storage-runtime-verification-living-thesis",
      title: "Verification risk",
      status: "open",
      severity: "medium",
      createdAt: "2026-08-24T12:00:00.000Z",
      updatedAt: "2026-08-24T12:00:00.000Z"
    }
  ],
  catalysts: [
    {
      id: "storage-runtime-verification-catalyst",
      thesisId: "storage-runtime-verification-living-thesis",
      title: "Verification catalyst",
      status: "open",
      createdAt: "2026-08-24T12:00:00.000Z",
      updatedAt: "2026-08-24T12:00:00.000Z"
    }
  ],
  nextReviewAt: "2026-09-24",
  createdAt: "2026-08-24T12:00:00.000Z",
  updatedAt: "2026-08-24T12:00:00.000Z"
};

const sharedTickerTheses: readonly LivingThesis[] = [
  {
    ...verificationThesis,
    id: "storage-runtime-verification-shared-ticker-a",
    ticker: "MSFT",
    title: "First shared-ticker thesis",
    risks: [],
    catalysts: []
  },
  {
    ...verificationThesis,
    id: "storage-runtime-verification-shared-ticker-b",
    ticker: "MSFT",
    title: "Second shared-ticker thesis",
    risks: [],
    catalysts: []
  }
];

export async function verifyStorageRuntime(
  options: StorageRuntimeVerificationOptions = {}
): Promise<StorageRuntimeVerificationResult> {
  const createStorage = options.createStorage ?? createSqliteStorage;
  const steps: string[] = [];
  let storage: SqliteStorage | undefined;

  try {
    storage = await createStorage();
    steps.push("created in-memory SQLite storage and ran migrations");

    const createResult =
      storage.repositories.watchlistItems.create(verificationItem);

    if (!createResult.ok) {
      throw new Error(
        `Could not create verification watchlist item: ${createResult.errors.join(
          "; "
        )}`
      );
    }

    if (createResult.value.ticker !== "MSFT") {
      throw new Error("Verification ticker was not normalized through the repository");
    }

    steps.push("created a watchlist item through the repository boundary");

    const readItem = storage.repositories.watchlistItems.getById(
      verificationItem.id
    );

    if (!readItem) {
      throw new Error("Could not read verification watchlist item");
    }

    steps.push("read the watchlist item through the repository boundary");

    const updateResult = storage.repositories.watchlistItems.update({
      ...readItem,
      note: "Updated by runtime storage verification."
    });

    if (!updateResult.ok) {
      throw new Error(
        `Could not update verification watchlist item: ${updateResult.errors.join(
          "; "
        )}`
      );
    }

    const updatedItem = storage.repositories.watchlistItems.getById(
      verificationItem.id
    );

    if (updatedItem?.note !== "Updated by runtime storage verification.") {
      throw new Error("Could not verify updated watchlist item content");
    }

    steps.push("updated the watchlist item through the repository boundary");

    const wasDeleted =
      storage.repositories.watchlistItems.delete(verificationItem.id);

    if (!wasDeleted) {
      throw new Error("Could not delete verification watchlist item");
    }

    if (storage.repositories.watchlistItems.getById(verificationItem.id)) {
      throw new Error("Verification watchlist item still exists after deletion");
    }

    steps.push("deleted the watchlist item through the repository boundary");

    const thesisCreate =
      storage.repositories.livingTheses.create(verificationThesis);

    if (!thesisCreate.ok) {
      throw new Error(
        `Could not create verification Living Thesis: ${thesisCreate.errors.join(
          "; "
        )}`
      );
    }

    for (const thesis of sharedTickerTheses) {
      const result = storage.repositories.livingTheses.create(thesis);

      if (!result.ok) {
        throw new Error(
          `Could not create shared-ticker Living Thesis: ${result.errors.join(
            "; "
          )}`
        );
      }
    }

    const readThesis = storage.repositories.livingTheses.getById(
      verificationThesis.id
    );

    if (
      !readThesis ||
      readThesis.ticker !== undefined ||
      readThesis.risks.length !== 1 ||
      readThesis.catalysts.length !== 1 ||
      storage.repositories.livingTheses.list().length !== 3
    ) {
      throw new Error("Could not verify Living Thesis aggregate persistence");
    }

    steps.push(
      "created and read tickerless, shared-ticker Living Thesis aggregates"
    );

    const thesisUpdate = storage.repositories.livingTheses.update(
      {
        ...readThesis,
        title: "Verified updated Living Thesis",
        updatedAt: "2026-08-24T13:00:00.000Z"
      },
      1
    );

    if (!thesisUpdate.ok || thesisUpdate.value.version !== 2) {
      throw new Error("Could not verify Living Thesis versioned update");
    }

    const staleUpdate = storage.repositories.livingTheses.update(
      {
        ...readThesis,
        title: "Stale update must not persist",
        updatedAt: "2026-08-24T14:00:00.000Z"
      },
      1
    );
    const afterStaleUpdate = storage.repositories.livingTheses.getById(
      verificationThesis.id
    );

    if (
      staleUpdate.ok ||
      afterStaleUpdate?.title !== "Verified updated Living Thesis" ||
      afterStaleUpdate.version !== 2
    ) {
      throw new Error("Living Thesis stale-write protection failed");
    }

    steps.push("verified Living Thesis versioning and stale-write protection");

    storage.close();
    storage = undefined;
    steps.push("closed the in-memory storage connection");

    return {
      ok: true,
      adapter: "node:sqlite",
      database: "memory",
      usesUserData: false,
      steps
    };
  } catch (error) {
    return {
      ok: false,
      adapter: "node:sqlite",
      database: "memory",
      usesUserData: false,
      steps,
      error: error instanceof Error ? error.message : String(error)
    };
  } finally {
    storage?.close();
  }
}
