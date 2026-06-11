// @vitest-environment jsdom
import { render, act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { IdleTracker } from "@/components/auth/ProtectedRoute";
import { useAuthStore } from "@/stores/authStore";

describe("IdleLockDoesNotLogout", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useAuthStore.setState({
      user: {
        id: "1",
        name: "Cashier",
        email: "cashier@example.com",
        role: "Cashier",
        outletIds: [1],
        pinSet: true,
        permissions: [],
      },
      locked: false,
      autoLock: true,
      idleMinutes: 1,
      accessToken: "token-abc",
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    useAuthStore.setState({
      user: null,
      locked: false,
      accessToken: null,
    });
  });

  it("locks the screen after idle without clearing the auth token", () => {
    render(<IdleTracker />);

    act(() => {
      vi.advanceTimersByTime(60_000);
    });

    expect(useAuthStore.getState().locked).toBe(true);
    expect(useAuthStore.getState().user).not.toBeNull();
    expect(useAuthStore.getState().accessToken).toBe("token-abc");
  });
});
