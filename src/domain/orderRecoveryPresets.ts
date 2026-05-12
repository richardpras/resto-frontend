/** Shared kitchen / POS operational recovery presets (API `targetStatus` values). */
export const ORDER_RECOVERY_PRESETS: { label: string; targetStatus: string; hint?: string }[] = [
  { label: "Sold out", targetStatus: "sold_out" },
  { label: "Ingredient unavailable", targetStatus: "ingredient_unavailable" },
  { label: "Preparation failed", targetStatus: "preparation_failed" },
  { label: "Printer / bar unavailable", targetStatus: "printer_unavailable" },
  { label: "Mark unavailable", targetStatus: "unavailable" },
  { label: "Reject item", targetStatus: "rejected", hint: "POS rejection" },
  { label: "Manual rejection", targetStatus: "manual_rejection", hint: "Manual rejection" },
];
