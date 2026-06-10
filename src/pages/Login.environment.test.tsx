// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { BrowserRouter } from "react-router-dom";
import Login from "./Login";

vi.mock("@/domain/environment", () => ({
  isDevelopmentEnvironment: vi.fn(),
}));

vi.mock("@/stores/authStore", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/stores/authStore")>();
  return {
    ...actual,
    useAuthStore: () => ({
      user: null,
      login: vi.fn().mockResolvedValue({ ok: true }),
    }),
  };
});

import { isDevelopmentEnvironment } from "@/domain/environment";

describe("Login environment hardening", () => {
  beforeEach(() => {
    vi.mocked(isDevelopmentEnvironment).mockReset();
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
});
