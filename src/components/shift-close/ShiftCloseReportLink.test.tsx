// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";

describe("ShiftCloseReportLink", () => {
  it("renders report link with run id", () => {
    const runId = 42;
    render(
      <MemoryRouter>
        <a href={`/shift-close?report=${runId}`}>View report (run #{runId})</a>
      </MemoryRouter>,
    );
    expect(screen.getByRole("link", { name: /View report/i })).toHaveAttribute("href", "/shift-close?report=42");
  });
});
