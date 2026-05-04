// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BrowserRouter } from "react-router-dom";
import Settings from "./Settings";

describe("Settings page", () => {
  it("renders settings shell and primary tab", () => {
    render(
      <BrowserRouter>
        <Settings />
      </BrowserRouter>,
    );

    expect(screen.getByRole("heading", { name: /Settings/i })).toBeTruthy();
    expect(screen.getByRole("tab", { name: /Merchant/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Reload settings from server/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Save all settings to server/i })).toBeTruthy();
  });
});
