import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const SRC_ROOT = path.join(process.cwd(), "src");

function listSourceFiles(dir: string): string[] {
  const entries = readdirSync(dir);
  const files: string[] = [];

  for (const entry of entries) {
    const full = path.join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      files.push(...listSourceFiles(full));
      continue;
    }

    if (/\.(ts|tsx)$/.test(entry)) {
      files.push(full);
    }
  }

  return files;
}

function toImports(content: string): string[] {
  return [...content.matchAll(/from\s+"([^"]+)"/g)].map((match) => match[1]);
}

describe("architecture boundaries", () => {
  it("prevents domain layer from importing outer layers", () => {
    const files = listSourceFiles(path.join(SRC_ROOT, "domain"));

    for (const file of files) {
      const imports = toImports(readFileSync(file, "utf8"));
      for (const imp of imports) {
        expect(imp.startsWith("@/frameworks/")).toBe(false);
        expect(imp.startsWith("@/interface-adapters/")).toBe(false);
        expect(imp.startsWith("@/app/")).toBe(false);
        expect(imp === "next" || imp.startsWith("next/")).toBe(false);
        expect(imp === "react" || imp.startsWith("react/")).toBe(false);
      }
    }
  });

  it("prevents application layer from importing framework or app layers", () => {
    const files = listSourceFiles(path.join(SRC_ROOT, "application"));

    for (const file of files) {
      const imports = toImports(readFileSync(file, "utf8"));
      for (const imp of imports) {
        expect(imp.startsWith("@/frameworks/")).toBe(false);
        expect(imp.startsWith("@/app/")).toBe(false);
      }
    }
  });
});
