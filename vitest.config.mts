import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "."),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    reporters: ["default"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary", "html"],
      reportsDirectory: "coverage",
      include: ["lib/**/*.ts"],
      exclude: ["lib/types.ts"],
      thresholds: {
        statements: 75,
        branches: 60,
        functions: 75,
        lines: 80,
      },
    },
  },
});
