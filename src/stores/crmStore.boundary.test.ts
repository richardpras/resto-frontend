import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

function collectPageFiles(dir: string): string[] {
  const entries = readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectPageFiles(full));
      continue;
    }
    if (/\.(tsx?|jsx?)$/.test(entry.name)) files.push(full);
  }
  return files;
}

describe("CRM boundary: page layer remains store-centric", () => {
  it("does not import crm endpoints in pages/components", () => {
    const pagesRoot = path.resolve(__dirname, "../pages");
    const files = collectPageFiles(pagesRoot);
    for (const file of files) {
      const source = readFileSync(file, "utf-8");
      expect(source).not.toMatch(/@\/lib\/api-integration\/crmEndpoints/);
    }
  });
});
