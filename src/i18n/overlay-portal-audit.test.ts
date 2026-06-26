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

/** Legacy full-screen overlays allowed until migrated to AppOverlay portal. */
const OVERLAY_EXEMPT = new Set([
  "components/payments/QrisPaymentModal.tsx",
  "components/payments/StaticQrisPaymentModal.tsx",
  "components/auth/LockScreen.tsx",
  "pages/MenuManagement.tsx",
  "pages/Kitchen.tsx",
]);

describe("overlay portal audit", () => {
  it("page-level fixed overlays use AppOverlay or z-modal (not raw z-50)", () => {
    const offenders: string[] = [];
    for (const file of collectTsxFiles(SRC_DIR)) {
      const relative = path.relative(SRC_DIR, file).replace(/\\/g, "/");
      if (!relative.startsWith("pages/") && !relative.startsWith("components/orders/")) continue;
      if (OVERLAY_EXEMPT.has(relative)) continue;
      const source = readFileSync(file, "utf-8");
      if (!source.includes("fixed inset-0")) continue;
      if (source.includes("AppOverlay") || source.includes("createPortal")) continue;
      if (source.includes("z-50") && !source.includes("z-modal") && !source.includes("z-paymentGateway")) {
        offenders.push(relative);
      }
    }
    expect(offenders, `Unmigrated fixed overlays: ${offenders.join(", ")}`).toEqual([]);
  });
});
