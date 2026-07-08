export type ReportDatePreset = "today" | "7d" | "14d" | "30d" | "90d" | "custom";

export type ReportDateRange = {
  preset: ReportDatePreset;
  startDate: string;
  endDate: string;
};

const PRESET_DAY_COUNTS: Record<Exclude<ReportDatePreset, "custom">, number> = {
  today: 1,
  "7d": 7,
  "14d": 14,
  "30d": 30,
  "90d": 90,
};

export function formatDateOnly(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function todayDateOnly(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return formatDateOnly(d);
}

export function resolvePresetRange(
  preset: Exclude<ReportDatePreset, "custom">,
  referenceDate: Date = new Date(),
): Pick<ReportDateRange, "startDate" | "endDate"> {
  const end = new Date(referenceDate);
  end.setHours(0, 0, 0, 0);
  const start = new Date(end);
  const days = PRESET_DAY_COUNTS[preset];
  start.setDate(start.getDate() - (days - 1));
  return {
    startDate: formatDateOnly(start),
    endDate: formatDateOnly(end),
  };
}

export function isValidDateOnly(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00`));
}

export function isValidDateRange(startDate: string, endDate: string): boolean {
  if (!isValidDateOnly(startDate) || !isValidDateOnly(endDate)) return false;
  return startDate <= endDate;
}

export function createReportDateRange(
  preset: ReportDatePreset,
  custom?: { startDate?: string; endDate?: string },
  referenceDate?: Date,
): ReportDateRange {
  if (preset === "custom") {
    const startDate = custom?.startDate ?? resolvePresetRange("30d", referenceDate).startDate;
    const endDate = custom?.endDate ?? resolvePresetRange("30d", referenceDate).endDate;
    return { preset, startDate, endDate };
  }
  const resolved = resolvePresetRange(preset, referenceDate);
  return { preset, ...resolved };
}

export function parseRangeFromUrl(searchParams: URLSearchParams): ReportDateRange | null {
  const range = searchParams.get("range");
  if (range && range !== "custom" && range in PRESET_DAY_COUNTS) {
    return createReportDateRange(range as Exclude<ReportDatePreset, "custom">);
  }
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  if (from && to && isValidDateRange(from, to)) {
    return { preset: "custom", startDate: from, endDate: to };
  }
  if (range === "custom" && from && to && isValidDateRange(from, to)) {
    return { preset: "custom", startDate: from, endDate: to };
  }
  return null;
}

export function writeRangeToUrl(searchParams: URLSearchParams, range: ReportDateRange): URLSearchParams {
  const next = new URLSearchParams(searchParams);
  next.set("range", range.preset);
  if (range.preset === "custom") {
    next.set("from", range.startDate);
    next.set("to", range.endDate);
  } else {
    next.delete("from");
    next.delete("to");
  }
  return next;
}
