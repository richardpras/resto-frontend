// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MenuItemImage } from "./MenuItemImage";

describe("MenuItemImage", () => {
  it("renders lazy image when url is provided", () => {
    render(
      <MenuItemImage
        imageUrl="https://example.test/menu.webp"
        imageVersion={2}
        emoji="🍛"
        name="Nasi Goreng"
      />,
    );

    const image = screen.getByRole("img", { name: "Nasi Goreng" });
    expect(image).toHaveAttribute("loading", "lazy");
    expect(image).toHaveAttribute("src", "https://example.test/menu.webp?v=2");
  });

  it("falls back to emoji when image fails to load", () => {
    render(
      <MenuItemImage
        imageUrl="https://example.test/broken.webp"
        imageVersion={1}
        emoji="🍗"
        name="Ayam Bakar"
      />,
    );

    const image = screen.getByRole("img", { name: "Ayam Bakar" });
    fireEvent.error(image);
    expect(screen.queryByRole("img", { name: "Ayam Bakar" })).not.toBeInTheDocument();
    expect(screen.getByText("🍗")).toBeInTheDocument();
  });
});
