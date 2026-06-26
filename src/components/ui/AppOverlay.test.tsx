// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AppOverlay } from "./AppOverlay";

describe("AppOverlay", () => {
  it("portals to document.body with modal z-index when open", () => {
    render(
      <AppOverlay open layer="modal" data-testid="test-overlay">
        <p>Payment content</p>
      </AppOverlay>,
    );
    const overlay = screen.getByTestId("test-overlay");
    expect(overlay.className).toContain("z-modal");
    expect(overlay.parentElement).toBe(document.body);
    expect(screen.getByText("Payment content")).toBeTruthy();
  });

  it("does not render when closed", () => {
    render(
      <AppOverlay open={false} data-testid="test-overlay">
        <p>Hidden</p>
      </AppOverlay>,
    );
    expect(screen.queryByTestId("test-overlay")).toBeNull();
  });
});
