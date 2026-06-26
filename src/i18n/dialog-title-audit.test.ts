import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const SRC_DIR = path.resolve(__dirname, "..");

function collectTsxFiles(dir: string): string[] {
  const entries = readdirSync(dir);
  const files: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      if (entry === "node_modules" || entry === "dist") continue;
      files.push(...collectTsxFiles(full));
    } else if (entry.endsWith(".tsx") && !entry.endsWith(".test.tsx")) {
      files.push(full);
    }
  }
  return files;
}

/** Files using Radix DialogContent without DialogTitle in the same file (a11y). */
const DIALOG_TITLE_EXEMPT = new Set([
  "components/ui/command.tsx",
]);

describe("DialogTitle accessibility audit", () => {
  it("DialogContent usages include DialogTitle in the same file", () => {
    const offenders: string[] = [];
    for (const file of collectTsxFiles(SRC_DIR)) {
      const relative = path.relative(SRC_DIR, file).replace(/\\/g, "/");
      if (DIALOG_TITLE_EXEMPT.has(relative)) continue;
      const source = readFileSync(file, "utf-8");
      if (!source.includes("DialogContent")) continue;
      if (!source.includes("DialogTitle")) {
        offenders.push(relative);
      }
    }
    expect(offenders, `DialogContent without DialogTitle: ${offenders.join(", ")}`).toEqual([]);
  });
});
