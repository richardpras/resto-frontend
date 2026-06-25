import { describe, expect, it } from "vitest";
import { useAuthStore } from "@/stores/authStore";

describe("authStore persist shape", () => {
  it("does not include locked in persisted snapshot", () => {
    useAuthStore.setState({
      user: {
        id: "1",
        name: "Cashier",
        email: "cashier@example.com",
        role: "Cashier",
        outletIds: [1],
        permissionCodes: ["pos.use"],
        pinSet: true,
        permissions: ["pos.use"],
      },
      locked: true,
      accessToken: "test-token",
      sessionRestoreStatus: "done",
    });

    const persisted = useAuthStore.persist.getOptions().partialize?.(useAuthStore.getState());
    expect(persisted).toBeDefined();
    expect(persisted).not.toHaveProperty("locked");
    expect(persisted).toHaveProperty("accessToken", "test-token");
  });
});
