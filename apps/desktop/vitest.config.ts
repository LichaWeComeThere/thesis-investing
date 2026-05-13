import { defineConfig } from "vitest/config";

export default defineConfig({
  ssr: {
    external: ["node:sqlite", "sqlite"]
  },
  test: {
    environment: "node"
  }
});
