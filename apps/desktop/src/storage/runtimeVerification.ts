import type { WatchlistItem } from "@thesis-investing/core";

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
