import { describe, expect, it } from "vitest";

import { verifyStorageRuntime } from "./runtimeVerification";

describe("verifyStorageRuntime", () => {
  it("verifies the SQLite adapter through the repository boundary", async () => {
    const result = await verifyStorageRuntime();

    if (!result.ok) {
      throw new Error(result.error);
    }

    expect(result.usesUserData).toBe(false);
    expect(result.database).toBe("memory");
    expect(result.steps).toEqual([
      "created in-memory SQLite storage and ran migrations",
      "created a watchlist item through the repository boundary",
      "read the watchlist item through the repository boundary",
      "updated the watchlist item through the repository boundary",
      "deleted the watchlist item through the repository boundary",
      "closed the in-memory storage connection"
    ]);
  });

  it("reports storage creation failures clearly", async () => {
    const result = await verifyStorageRuntime({
      createStorage: async () => {
        throw new Error("runtime adapter unavailable");
      }
    });

    expect(result).toMatchObject({
      ok: false,
      adapter: "node:sqlite",
      database: "memory",
      usesUserData: false,
      error: "runtime adapter unavailable"
    });
  });
});
