// @vitest-environment jsdom
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AuditSearch } from "./AuditSearch";

describe("AuditSearch", () => {
  it("submits search query", () => {
    const onSearch = vi.fn();
    render(<AuditSearch onSearch={onSearch} />);

    fireEvent.change(screen.getByPlaceholderText(/Search document numbers/), {
      target: { value: "PO-0042" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Search" }));

    expect(onSearch).toHaveBeenCalledWith("PO-0042");
  });
});
