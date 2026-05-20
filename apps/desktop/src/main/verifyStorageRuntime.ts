import { app } from "electron";

import { verifyStorageRuntime } from "../storage/runtimeVerification";

function requestCleanQuit(exitCode: number): void {
  process.exitCode = exitCode;

  const fallback = setTimeout(() => {
    console.error(
      `[storage verification] Electron did not quit cleanly; forcing exit ${exitCode}.`
    );
    process.exit(exitCode);
  }, 5000);
  fallback.unref();

  app.once("quit", () => {
    clearTimeout(fallback);
  });

  const quit = () => {
    app.quit();
  };

  if (app.isReady()) {
    setImmediate(quit);
    return;
  }

  app.once("ready", quit);
}

async function main() {
  await app.whenReady();

  const result = await verifyStorageRuntime();

  if (result.ok) {
    console.log("[storage verification] SQLite runtime verification passed.");
    for (const step of result.steps) {
      console.log(`[storage verification] ${step}`);
    }

    requestCleanQuit(0);
    return;
  }

  console.error("[storage verification] SQLite runtime verification failed.");
  for (const step of result.steps) {
    console.error(`[storage verification] completed: ${step}`);
  }
  console.error(`[storage verification] error: ${result.error}`);
  requestCleanQuit(1);
}

main().catch((error: unknown) => {
  console.error("[storage verification] unexpected failure.");
  console.error(error instanceof Error ? error.message : String(error));
  requestCleanQuit(1);
});
