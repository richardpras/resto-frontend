import { describe, expect, it } from "vitest";
import { expandPermissionCodes, PERMISSIONS } from "@/stores/authStore";

describe("expandPermissionCodes", () => {
  it("does not upgrade settings.view or settings.update to settings.manage", () => {
    const expanded = expandPermissionCodes(["settings.view", "settings.update"]);
    expect(expanded).not.toContain("settings.manage");
    expect(expanded).not.toContain(PERMISSIONS.SETTINGS);
  });

  it("does not grant cost.view or members.manage from pos.use alone", () => {
    const expanded = expandPermissionCodes(["pos.use"]);
    expect(expanded).not.toContain(PERMISSIONS.COST_VIEW);
    expect(expanded).not.toContain(PERMISSIONS.GIFT_CARDS);
    expect(expanded).not.toContain(PERMISSIONS.MEMBERS);
  });

  it("does not grant purchase.approve from purchase.manage alone", () => {
    const expanded = expandPermissionCodes(["purchase.manage"]);
    expect(expanded).not.toContain("purchase.approve");
    expect(expanded).not.toContain(PERMISSIONS.PURCHASE_APPROVE);
  });

  it("does not upgrade users.view to users.manage", () => {
    const expanded = expandPermissionCodes(["users.view", "roles.view", "permissions.view"]);
    expect(expanded).not.toContain("users.manage");
    expect(expanded).not.toContain(PERMISSIONS.USERS);
  });

  it("still aliases foodcost.view to cost.view for route guards", () => {
    const expanded = expandPermissionCodes(["foodcost.view"]);
    expect(expanded).toContain(PERMISSIONS.COST_VIEW);
  });
});
