import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const projectRoot = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@thesis-investing/core": resolve(
        projectRoot,
        "../../packages/core/src/index.ts"
      ),
      "@thesis-investing/ui": resolve(
        projectRoot,
        "../../packages/ui/src/index.ts"
      )
    }
  },
  ssr: {
    external: ["node:sqlite", "sqlite"]
  },
  test: {
    environment: "node"
  }
});
