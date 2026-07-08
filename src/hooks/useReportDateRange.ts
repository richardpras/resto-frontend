import { useCallback, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  createReportDateRange,
  isValidDateRange,
  parseRangeFromUrl,
  type ReportDatePreset,
  type ReportDateRange,
  writeRangeToUrl,
} from "@/lib/reporting/dateRangePresets";

export type UseReportDateRangeOptions = {
  defaultPreset?: ReportDatePreset;
  syncUrl?: boolean;
  /** When true, changing preset/dates does not auto-apply custom until applyCustom is called */
  deferCustomApply?: boolean;
};

export type UseReportDateRangeResult = ReportDateRange & {
  setPreset: (preset: ReportDatePreset) => void;
  setCustomDates: (startDate: string, endDate: string) => void;
  applyCustom: () => void;
  draftStartDate: string;
  draftEndDate: string;
  setDraftStartDate: (value: string) => void;
  setDraftEndDate: (value: string) => void;
};

export function useReportDateRange(options: UseReportDateRangeOptions = {}): UseReportDateRangeResult {
  const { defaultPreset = "30d", syncUrl = false, deferCustomApply = false } = options;
  const [searchParams, setSearchParams] = useSearchParams();

  const initial = useMemo(() => {
    if (syncUrl) {
      const fromUrl = parseRangeFromUrl(searchParams);
      if (fromUrl) return fromUrl;
    }
    return createReportDateRange(defaultPreset);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- mount only

  const [range, setRange] = useState<ReportDateRange>(initial);
  const [draftStartDate, setDraftStartDate] = useState(range.startDate);
  const [draftEndDate, setDraftEndDate] = useState(range.endDate);

  const commitRange = useCallback(
    (next: ReportDateRange) => {
      setRange(next);
      setDraftStartDate(next.startDate);
      setDraftEndDate(next.endDate);
      if (syncUrl) {
        setSearchParams(writeRangeToUrl(searchParams, next), { replace: true });
      }
    },
    [searchParams, setSearchParams, syncUrl],
  );

  const setPreset = useCallback(
    (preset: ReportDatePreset) => {
      if (preset === "custom") {
        setRange((prev) => ({ ...prev, preset: "custom" }));
        return;
      }
      commitRange(createReportDateRange(preset));
    },
    [commitRange],
  );

  const setCustomDates = useCallback(
    (startDate: string, endDate: string) => {
      setDraftStartDate(startDate);
      setDraftEndDate(endDate);
      if (!deferCustomApply && isValidDateRange(startDate, endDate)) {
        commitRange({ preset: "custom", startDate, endDate });
      }
    },
    [commitRange, deferCustomApply],
  );

  const applyCustom = useCallback(() => {
    if (!isValidDateRange(draftStartDate, draftEndDate)) return;
    commitRange({ preset: "custom", startDate: draftStartDate, endDate: draftEndDate });
  }, [commitRange, draftEndDate, draftStartDate]);

  return {
    ...range,
    setPreset,
    setCustomDates,
    applyCustom,
    draftStartDate,
    draftEndDate,
    setDraftStartDate,
    setDraftEndDate,
  };
}
