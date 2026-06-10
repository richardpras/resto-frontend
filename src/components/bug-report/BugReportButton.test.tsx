// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

vi.mock("html2canvas", () => ({
  default: vi.fn().mockResolvedValue({
    toDataURL: () => "data:image/webp;base64,abc",
    toBlob: (cb: (b: Blob | null) => void) => cb(new Blob(["x"], { type: "image/webp" })),
  }),
}));

import { BugReportButton } from "./BugReportButton";

describe("BugReportButton", () => {
  it("renders on authenticated app routes", () => {
    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <BugReportButton />
      </MemoryRouter>,
    );
    expect(screen.getByRole("button", { name: /report bug/i })).toBeInTheDocument();
  });

  it("hides on payment status route", () => {
    render(
      <MemoryRouter initialEntries={["/payment-status"]}>
        <BugReportButton />
      </MemoryRouter>,
    );
    expect(screen.queryByRole("button", { name: /report bug/i })).not.toBeInTheDocument();
  });
});
