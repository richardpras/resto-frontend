// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { HUB_CARDS } from "./ReportsHub";

vi.mock("@/components/system-health/SystemHealthHubSummary", () => ({
  SystemHealthHubSummary: () => <div data-testid="system-health-summary">Summary</div>,
}));

describe("ReportsHubSystemHealthCard", () => {
  it("includes system health center card", () => {
    const card = HUB_CARDS.find((c) => c.id === "system-health-center");
    expect(card).toBeDefined();
    expect(card?.to).toBe("/system/health");
    expect(card?.title).toBe("System Health Center");
  });

  it("renders card with footer summary", () => {
    const card = HUB_CARDS.find((c) => c.id === "system-health-center");
    render(
      <MemoryRouter>
        <div>
          <h2>{card?.title}</h2>
          {card?.footer}
        </div>
      </MemoryRouter>,
    );
    expect(screen.getByText("System Health Center")).toBeInTheDocument();
    expect(screen.getByTestId("system-health-summary")).toBeInTheDocument();
  });
});
