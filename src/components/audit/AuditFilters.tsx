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
import type { ListAuditCenterParams } from "@/lib/api-integration/auditCenterEndpoints";

const MODULE_OPTIONS = [
  { value: "", label: "All modules" },
  { value: "pos", label: "POS" },
  { value: "purchase", label: "Purchase" },
  { value: "accounting", label: "Accounting" },
  { value: "payroll", label: "Payroll" },
  { value: "inventory", label: "Inventory" },
  { value: "hr", label: "HR" },
  { value: "payments", label: "Payments" },
  { value: "gift_cards", label: "Gift Cards" },
  { value: "menu", label: "Menu Intelligence" },
  { value: "notifications", label: "Notifications" },
  { value: "system", label: "System" },
];

type AuditFiltersProps = {
  filters: ListAuditCenterParams;
  onChange: (filters: ListAuditCenterParams) => void;
  onApply: () => void;
  onReset: () => void;
};

export function AuditFilters({ filters, onChange, onApply, onReset }: AuditFiltersProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 p-4 border rounded-xl bg-muted/30">
      <div className="space-y-1">
        <Label htmlFor="audit-module">Module</Label>
        <Select
          value={filters.module ?? "all"}
          onValueChange={(value) =>
            onChange({ ...filters, module: value === "all" ? undefined : value })
          }
        >
          <SelectTrigger id="audit-module">
            <SelectValue placeholder="All modules" />
          </SelectTrigger>
          <SelectContent>
            {MODULE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value || "all"} value={opt.value || "all"}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <Label htmlFor="audit-entity-type">Entity type</Label>
        <Input
          id="audit-entity-type"
          placeholder="e.g. purchase_order"
          value={filters.entityType ?? ""}
          onChange={(e) => onChange({ ...filters, entityType: e.target.value || undefined })}
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="audit-action">Action</Label>
        <Input
          id="audit-action"
          placeholder="e.g. approved"
          value={filters.action ?? ""}
          onChange={(e) => onChange({ ...filters, action: e.target.value || undefined })}
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="audit-start">Start date</Label>
        <Input
          id="audit-start"
          type="date"
          value={filters.startDate?.slice(0, 10) ?? ""}
          onChange={(e) => onChange({ ...filters, startDate: e.target.value || undefined })}
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="audit-end">End date</Label>
        <Input
          id="audit-end"
          type="date"
          value={filters.endDate?.slice(0, 10) ?? ""}
          onChange={(e) => onChange({ ...filters, endDate: e.target.value || undefined })}
        />
      </div>

      <div className="flex items-end gap-2 md:col-span-3">
        <Button onClick={onApply}>Apply filters</Button>
        <Button variant="outline" onClick={onReset}>
          Reset
        </Button>
      </div>
    </div>
  );
}
