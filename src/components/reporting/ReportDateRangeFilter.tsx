import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useErpTranslation } from "@/i18n/useErpTranslation";
import type { ReportDatePreset } from "@/lib/reporting/dateRangePresets";
import type { UseReportDateRangeResult } from "@/hooks/useReportDateRange";

const STANDARD_PRESETS: ReportDatePreset[] = ["today", "7d", "14d", "30d", "custom"];

type Props = {
  range: UseReportDateRangeResult;
  extraPresets?: ReportDatePreset[];
  showApply?: boolean;
  className?: string;
  compact?: boolean;
};

export function ReportDateRangeFilter({
  range,
  extraPresets = [],
  showApply = false,
  className = "",
  compact = false,
}: Props) {
  const { t } = useErpTranslation();
  const uniquePresets = Array.from(
    new Set([...STANDARD_PRESETS.slice(0, -1), ...extraPresets, "custom"]),
  ) as ReportDatePreset[];

  return (
    <div className={`flex flex-wrap items-end gap-3 ${className}`}>
      <div className="space-y-1">
        {!compact ? <Label>{t("reports.dateRange.label")}</Label> : null}
        <Select value={range.preset} onValueChange={(v) => range.setPreset(v as ReportDatePreset)}>
          <SelectTrigger className={compact ? "w-[160px] h-9" : "w-[180px]"}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {uniquePresets.map((preset) => (
              <SelectItem key={preset} value={preset}>
                {t(`reports.dateRange.${preset}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {range.preset === "custom" && (
        <>
          <div className="space-y-1">
            {!compact ? <Label htmlFor="report-range-from">{t("reports.dateRange.from")}</Label> : null}
            <Input
              id="report-range-from"
              type="date"
              className={compact ? "w-[140px] h-9" : "w-[160px]"}
              value={range.draftStartDate}
              onChange={(e) => range.setDraftStartDate(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            {!compact ? <Label htmlFor="report-range-to">{t("reports.dateRange.to")}</Label> : null}
            <Input
              id="report-range-to"
              type="date"
              className={compact ? "w-[140px] h-9" : "w-[160px]"}
              value={range.draftEndDate}
              onChange={(e) => range.setDraftEndDate(e.target.value)}
            />
          </div>
          {(showApply || range.preset === "custom") && (
            <Button type="button" variant="secondary" size={compact ? "sm" : "default"} onClick={() => range.applyCustom()}>
              {t("reports.dateRange.apply")}
            </Button>
          )}
        </>
      )}
    </div>
  );
}
