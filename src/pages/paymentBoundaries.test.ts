import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

function collectSourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) return collectSourceFiles(path);
    return /\.(ts|tsx)$/.test(entry) ? [path] : [];
  });
}

describe("payment API boundaries", () => {
  it("keeps pages and components behind payment store actions", () => {
    const files = [
      ...collectSourceFiles(join(process.cwd(), "src", "pages")),
      ...collectSourceFiles(join(process.cwd(), "src", "components")),
    ].filter((file) => !file.endsWith(".test.ts") && !file.endsWith(".test.tsx"));

    const directPaymentApiUsers = files.filter((file) => {
      const source = readFileSync(file, "utf8");
      return source.includes("@/lib/api-integration/paymentEndpoints");
    });

    expect(directPaymentApiUsers).toEqual([]);
  });
});
