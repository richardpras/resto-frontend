export type PermissionLike = { id: number; code: string; name: string };

export type PermissionGroup = {
  prefix: string;
  label: string;
  items: PermissionLike[];
};

function prefixOf(code: string): string {
  const i = code.indexOf(".");
  return i === -1 ? "other" : code.slice(0, i);
}

/** Groups API permission rows by the substring before the first dot in `code` (e.g. `payroll.create` → `payroll`). */
export function groupPermissionsByCodePrefix(rows: PermissionLike[]): PermissionGroup[] {
  const map = new Map<string, PermissionLike[]>();
  for (const row of rows) {
    const p = prefixOf(row.code);
    const list = map.get(p) ?? [];
    list.push(row);
    map.set(p, list);
  }
  const groups: PermissionGroup[] = [];
  for (const [prefix, items] of map) {
    items.sort((a, b) => a.code.localeCompare(b.code));
    groups.push({
      prefix,
      label: prefix === "other" ? "Other" : capitalizeSegment(prefix),
      items,
    });
  }
  groups.sort((a, b) => a.label.localeCompare(b.label));
  return groups;
}

function capitalizeSegment(s: string): string {
  return s
    .split(/[-_]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
