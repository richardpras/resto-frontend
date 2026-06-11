// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { BrowserRouter } from "react-router-dom";
import Login from "./Login";

vi.mock("@/domain/environment", () => ({
  isDevelopmentEnvironment: vi.fn(),
}));

const loginMock = vi.fn();

vi.mock("@/stores/authStore", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/stores/authStore")>();
  return {
    ...actual,
    useAuthStore: () => ({
      user: null,
      login: loginMock,
    }),
  };
});

import { isDevelopmentEnvironment } from "@/domain/environment";

describe("Login environment hardening", () => {
  beforeEach(() => {
    vi.mocked(isDevelopmentEnvironment).mockReset();
    loginMock.mockReset();
    loginMock.mockResolvedValue({ ok: true });
  });

  it("shows demo accounts section when development environment", () => {
    vi.mocked(isDevelopmentEnvironment).mockReturnValue(true);

    render(
      <BrowserRouter>
        <Login />
      </BrowserRouter>,
    );

    expect(screen.getByText("Demo accounts")).toBeTruthy();
    expect(screen.getByText("Owner")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Sign in/i })).toBeTruthy();
    expect(screen.getByLabelText("Email")).toBeTruthy();
  });

  it("hides demo accounts section when not development environment", () => {
    vi.mocked(isDevelopmentEnvironment).mockReturnValue(false);

    render(
      <BrowserRouter>
        <Login />
      </BrowserRouter>,
    );

    expect(screen.queryByText("Demo accounts")).toBeNull();
    expect(screen.queryByText("owner@resto.com")).toBeNull();
    expect(screen.getByRole("button", { name: /Sign in/i })).toBeTruthy();
    expect(screen.getByLabelText("Email")).toBeTruthy();
    expect(screen.getByLabelText("Password")).toBeTruthy();
  });

  it("shows loading indicator while sign in is in progress", async () => {
    vi.mocked(isDevelopmentEnvironment).mockReturnValue(false);
    let resolveLogin: (value: { ok: boolean }) => void = () => {};
    loginMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveLogin = resolve;
        }),
    );

    render(
      <BrowserRouter>
        <Login />
      </BrowserRouter>,
    );

    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "owner@demo.resto.local" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "demo123" } });
    fireEvent.click(screen.getByRole("button", { name: /^Sign in$/i }));

    expect(await screen.findByRole("button", { name: /Signing in/i })).toBeDisabled();
    expect(screen.getByLabelText("Email")).toBeDisabled();
    expect(screen.getByLabelText("Password")).toBeDisabled();

    resolveLogin({ ok: true });

    await waitFor(() => {
      expect(screen.queryByRole("button", { name: /Signing in/i })).toBeNull();
    });
  });
});
