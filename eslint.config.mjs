import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["src/domain/**/*.ts", "src/domain/**/*.tsx"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            { group: ["next/*", "next"], message: "Domain cannot depend on Next.js." },
            { group: ["react", "react/*"], message: "Domain cannot depend on React." },
            {
              group: ["@/frameworks/*", "@/interface-adapters/*", "@/app/*"],
              message: "Domain cannot import outer layers.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/application/**/*.ts", "src/application/**/*.tsx"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/frameworks/*", "@/interface-adapters/*", "@/app/*"],
              message: "Application layer cannot import outer layers.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/interface-adapters/**/*.ts", "src/interface-adapters/**/*.tsx"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/frameworks/*", "@/app/*"],
              message: "Interface adapters must not depend on framework entrypoints.",
            },
          ],
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
