import { app } from "electron";

import { verifyStorageRuntime } from "../storage/runtimeVerification";

async function main() {
  await app.whenReady();

  const result = await verifyStorageRuntime();

  if (result.ok) {
    console.log("[storage verification] SQLite runtime verification passed.");
    for (const step of result.steps) {
      console.log(`[storage verification] ${step}`);
    }

    app.exit(0);
    return;
  }

  console.error("[storage verification] SQLite runtime verification failed.");
  for (const step of result.steps) {
    console.error(`[storage verification] completed: ${step}`);
  }
  console.error(`[storage verification] error: ${result.error}`);
  app.exit(1);
}

main().catch((error: unknown) => {
  console.error("[storage verification] unexpected failure.");
  console.error(error instanceof Error ? error.message : String(error));
  app.exit(1);
});
