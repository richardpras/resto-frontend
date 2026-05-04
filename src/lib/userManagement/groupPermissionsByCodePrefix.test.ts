import { describe, expect, it } from "vitest";
import { groupPermissionsByCodePrefix } from "./groupPermissionsByCodePrefix";

describe("groupPermissionsByCodePrefix", () => {
  it("groups by first segment of dotted codes and sorts items", () => {
    const groups = groupPermissionsByCodePrefix([
      { id: 2, code: "payroll.create", name: "Create" },
      { id: 1, code: "payroll.view", name: "View" },
      { id: 3, code: "users.view", name: "Users view" },
    ]);
    expect(groups.map((g) => g.prefix).sort()).toEqual(["payroll", "users"]);
    const payroll = groups.find((g) => g.prefix === "payroll");
    expect(payroll?.items.map((i) => i.code)).toEqual(["payroll.create", "payroll.view"]);
  });

  it("places codes without a dot under other", () => {
    const groups = groupPermissionsByCodePrefix([{ id: 1, code: "singleton", name: "S" }]);
    expect(groups).toHaveLength(1);
    expect(groups[0].prefix).toBe("other");
    expect(groups[0].items[0].code).toBe("singleton");
  });
});
