import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const PAGES_DIR = path.resolve(__dirname, "../pages");

/** Pre-existing pages outside the bilingual sweep — guard targets swept modules only. */
const EXCLUDED_RELATIVE = new Set([
  "employee/Login.tsx",
  "settings/PaymentHealth.tsx",
]);

function collectPageFiles(dir: string): string[] {
  const entries = readdirSync(dir);
  const files: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      files.push(...collectPageFiles(full));
    } else if (entry.endsWith(".tsx") && !entry.endsWith(".test.tsx")) {
      files.push(full);
    }
  }
  return files;
}

const TITLE_PATTERN = /className="[^"]*text-2xl[^"]*font-bold[^"]*">([A-Z][^<{]+)</;

describe("i18n page title guardrail", () => {
  it("pages with hardcoded English h1 titles should use t()", () => {
    const offenders: string[] = [];
    for (const file of collectPageFiles(PAGES_DIR)) {
      const relative = path.relative(PAGES_DIR, file).replace(/\\/g, "/");
      if (EXCLUDED_RELATIVE.has(relative)) continue;
      const source = readFileSync(file, "utf-8");
      if (!TITLE_PATTERN.test(source)) continue;
      if (!source.includes("useErpTranslation") && !source.includes("useOpsTranslation") && !source.includes("useTranslation(")) {
        offenders.push(relative);
      }
    }
    expect(offenders, `Hardcoded title without i18n hook: ${offenders.join(", ")}`).toEqual([]);
  });
});
