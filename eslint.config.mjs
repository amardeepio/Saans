import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      // Keep files reviewable and stop screens drifting back into monoliths.
      "max-lines": [
        "error",
        { max: 360, skipBlankLines: true, skipComments: true },
      ],
      complexity: ["error", 20],
      "max-depth": ["error", 4],
      "max-params": ["error", 5],
      "no-console": "error",
    },
  },
  {
    // Dictionaries are long by nature and are pure data.
    files: ["lib/locales/**"],
    rules: { "max-lines": "off" },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "coverage/**",
    "next-env.d.ts",
    "public/sw.js",
  ]),
]);
