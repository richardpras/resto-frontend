// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import POS from "./POS";

describe("POS split qty editor", () => {
  it("allows cross-person qty split with per-item cap", async () => {
    render(<POS />);

    const menuCard = screen.getByText("Nasi Goreng Special");
    fireEvent.click(menuCard);
    fireEvent.click(menuCard);
    fireEvent.click(menuCard);

    fireEvent.click(screen.getByText("Pay Now"));
    fireEvent.click(screen.getByText("Split Bill"));
    fireEvent.click(screen.getByText("Split by Item"));

    const personOneQty = await screen.findByTestId("split-qty-0-1");
    const personTwoQty = await screen.findByTestId("split-qty-1-1");

    fireEvent.change(personOneQty, { target: { value: "2" } });
    fireEvent.change(personTwoQty, { target: { value: "2" } });

    expect((personOneQty as HTMLInputElement).value).toBe("2");
    expect((personTwoQty as HTMLInputElement).value).toBe("1");
  });

  it("allows creating split order before full payment", async () => {
    render(<POS />);
    const menuCard = screen.getByText("Nasi Goreng Special");
    fireEvent.click(menuCard);
    fireEvent.click(menuCard);
    fireEvent.click(screen.getByText("Pay Now"));
    fireEvent.click(screen.getByText("Split Bill"));
    fireEvent.click(screen.getByText("Split by Item"));

    fireEvent.change(await screen.findByTestId("split-qty-0-1"), { target: { value: "1" } });
    fireEvent.change(await screen.findByTestId("split-qty-1-1"), { target: { value: "1" } });
    expect(screen.getByRole("button", { name: "Create Split Order" })).not.toBeDisabled();
  });
});
