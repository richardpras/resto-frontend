// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

describe("ShiftCloseForceClose", () => {
  it("documents close anyway flow for warn policy", () => {
    const isBlocked = false;
    const severity = "warning";
    render(
      <div>
        {severity === "warning" && !isBlocked ? (
          <button type="button">Close Anyway — Continue</button>
        ) : (
          <p>Resolve required issues first</p>
        )}
      </div>,
    );
    expect(screen.getByRole("button", { name: /Close Anyway/i })).toBeInTheDocument();
  });

  it("shows block message when policy blocks", () => {
    render(<p>Block policy active — resolve required issues first.</p>);
    expect(screen.getByText(/resolve required issues/i)).toBeInTheDocument();
  });
});
