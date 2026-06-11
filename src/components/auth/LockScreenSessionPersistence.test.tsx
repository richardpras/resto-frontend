// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LockScreen } from "@/components/auth/LockScreen";
import { useAuthStore } from "@/stores/authStore";
import { useOutletStore } from "@/stores/outletStore";

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => (
      <div {...props}>{children}</div>
    ),
  },
}));

describe("LockScreenSessionPersistence", () => {
  it("shows lock UI while preserving auth and outlet context", () => {
    useOutletStore.setState({ activeOutletId: 7, activeOutletCode: "JKT" });
    useAuthStore.setState({
      user: {
        id: "1",
        name: "Cashier One",
        email: "cashier@example.com",
        role: "Cashier",
        outletIds: [7],
        pinSet: true,
        permissions: [],
      },
      locked: true,
      accessToken: "persisted-token",
    });

    render(<LockScreen />);

    expect(screen.getByText("Screen Locked")).toBeInTheDocument();
    expect(screen.getByText(/Cashier One/)).toBeInTheDocument();
    expect(useAuthStore.getState().accessToken).toBe("persisted-token");
    expect(useOutletStore.getState().activeOutletId).toBe(7);
  });
});
