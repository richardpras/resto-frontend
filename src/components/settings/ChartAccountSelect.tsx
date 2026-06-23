import { useEffect, useMemo, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { listAccounts, type AccountApiRow } from "@/lib/api-integration/accountingEndpoints";

type ChartAccountSelectProps = {
  value?: number | null;
  onChange: (value: number | null) => void;
  accountType?: AccountApiRow["type"];
  placeholder?: string;
  disabled?: boolean;
};

const NONE_VALUE = "__none__";

export default function ChartAccountSelect({
  value,
  onChange,
  accountType = "asset",
  placeholder = "Select GL account",
  disabled = false,
}: ChartAccountSelectProps) {
  const [accounts, setAccounts] = useState<AccountApiRow[]>([]);

  useEffect(() => {
    let cancelled = false;
    void listAccounts()
      .then((rows) => {
        if (!cancelled) setAccounts(rows);
      })
      .catch(() => {
        if (!cancelled) setAccounts([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const options = useMemo(
    () => accounts.filter((a) => a.active && a.type === accountType).sort((a, b) => a.code.localeCompare(b.code)),
    [accounts, accountType],
  );

  const selectValue = value && value > 0 ? String(value) : NONE_VALUE;

  return (
    <Select
      value={selectValue}
      onValueChange={(next) => onChange(next === NONE_VALUE ? null : Number(next))}
      disabled={disabled}
    >
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NONE_VALUE}>—</SelectItem>
        {options.map((account) => (
          <SelectItem key={account.id} value={account.id}>
            {account.code} — {account.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
