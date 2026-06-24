// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PublicGuestStandaloneGuard } from "./PublicGuestStandaloneGuard";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        "pwa.guestStandaloneTitle": "Open in a regular browser",
        "pwa.guestStandaloneBody": "Table ordering links are for guest browsers only.",
      };
      return map[key] ?? key;
    },
  }),
}));

describe("PublicGuestStandaloneGuard", () => {
  beforeEach(() => {
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
      onchange: null,
    }));
  });

  it("renders children in browser mode", () => {
    render(
      <PublicGuestStandaloneGuard>
        <p data-testid="guest-content">Guest menu</p>
      </PublicGuestStandaloneGuard>,
    );
    expect(screen.getByTestId("guest-content")).toBeInTheDocument();
    expect(screen.queryByTestId("guest-standalone-block")).not.toBeInTheDocument();
  });

  it("blocks content in standalone display mode", () => {
    vi.stubGlobal("matchMedia", () => ({
      matches: true,
      media: "(display-mode: standalone)",
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
      onchange: null,
    }));

    render(
      <PublicGuestStandaloneGuard>
        <p data-testid="guest-content">Guest menu</p>
      </PublicGuestStandaloneGuard>,
    );

    expect(screen.getByTestId("guest-standalone-block")).toBeInTheDocument();
    expect(screen.getByText(/Open in a regular browser/i)).toBeInTheDocument();
    expect(screen.queryByTestId("guest-content")).not.toBeInTheDocument();
  });
});
