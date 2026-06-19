// @vitest-environment jsdom
import { render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import i18n from "@/i18n";
import { GuestLocaleBootstrap } from "@/hooks/useGuestLocaleBootstrap";

const mockSearchParams = new URLSearchParams();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useSearchParams: () => [mockSearchParams],
  };
});

describe("GuestLocaleBootstrap", () => {
  beforeEach(async () => {
    localStorage.clear();
    [...mockSearchParams.keys()].forEach((key) => mockSearchParams.delete(key));
    await i18n.changeLanguage("en");
  });

  it("applies lang query param and persists to storage", async () => {
    mockSearchParams.set("lang", "id");
    render(<GuestLocaleBootstrap />);

    await waitFor(() => {
      expect(i18n.language).toBe("id");
    });
    expect(localStorage.getItem("resto-guest-locale")).toBe("id");
  });
});
