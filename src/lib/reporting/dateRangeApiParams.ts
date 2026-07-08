import type { ReportDateRange } from "./dateRangePresets";

export function toStartEndParams(range: Pick<ReportDateRange, "startDate" | "endDate">) {
  return { startDate: range.startDate, endDate: range.endDate };
}

export function toFromToParams(range: Pick<ReportDateRange, "startDate" | "endDate">) {
  return { from: range.startDate, to: range.endDate };
}

export function toFromDateToDateParams(range: Pick<ReportDateRange, "startDate" | "endDate">) {
  return { fromDate: range.startDate, toDate: range.endDate };
}

export function toDateFromDateToParams(range: Pick<ReportDateRange, "startDate" | "endDate">) {
  return { dateFrom: range.startDate, dateTo: range.endDate };
}

export function toCreatedFromToParams(range: Pick<ReportDateRange, "startDate" | "endDate">) {
  return { createdFrom: range.startDate, createdTo: range.endDate };
}
