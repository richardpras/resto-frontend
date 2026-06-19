import { describe, expect, it } from "vitest";
import enCommon from "@/i18n/locales/en/common.json";
import idCommon from "@/i18n/locales/id/common.json";
import enErp from "@/i18n/locales/en/erp.json";
import idErp from "@/i18n/locales/id/erp.json";
import enOps from "@/i18n/locales/en/ops.json";
import idOps from "@/i18n/locales/id/ops.json";

function flattenKeys(obj: Record<string, unknown>, prefix = ""): string[] {
  const keys: string[] = [];
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      keys.push(...flattenKeys(value as Record<string, unknown>, path));
    } else {
      keys.push(path);
    }
  }
  return keys.sort();
}

function assertKeyParity(label: string, en: Record<string, unknown>, id: Record<string, unknown>) {
  const enKeys = flattenKeys(en);
  const idKeys = flattenKeys(id);
  const enOnly = enKeys.filter((k) => !idKeys.includes(k));
  const idOnly = idKeys.filter((k) => !enKeys.includes(k));

  expect(enOnly, `${label}: keys in EN but missing in ID`).toEqual([]);
  expect(idOnly, `${label}: keys in ID but missing in EN`).toEqual([]);
}

describe("locale key parity (en vs id)", () => {
  it("common.json keys match", () => {
    assertKeyParity("common", enCommon, idCommon);
  });

  it("erp.json keys match", () => {
    assertKeyParity("erp", enErp, idErp);
  });

  it("ops.json keys match", () => {
    assertKeyParity("ops", enOps, idOps);
  });
});
