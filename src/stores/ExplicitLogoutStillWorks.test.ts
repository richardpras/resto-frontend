import { afterEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/stores/authStore";
import { setApiAccessToken } from "@/lib/api-integration/client";

vi.mock("@/lib/api-integration/userManagementEndpoints", () => ({
  logout: vi.fn().mockResolvedValue({ message: "ok" }),
  login: vi.fn(),
  me: vi.fn(),
  verifyScreenPin: vi.fn(),
}));

describe("ExplicitLogoutStillWorks", () => {
  afterEach(() => {
    useAuthStore.setState({
      user: null,
      locked: false,
      accessToken: null,
    });
    setApiAccessToken(undefined);
    vi.clearAllMocks();
  });

  it("clears user and token on explicit logout", () => {
    useAuthStore.setState({
      user: {
        id: "1",
        name: "Owner",
        email: "owner@example.com",
        role: "Owner",
        outletIds: [1],
        pinSet: true,
        permissions: [],
      },
      locked: true,
      accessToken: "token-to-clear",
    });
    setApiAccessToken("token-to-clear");

    useAuthStore.getState().logout();

    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().accessToken).toBeNull();
    expect(useAuthStore.getState().locked).toBe(false);
  });
});
