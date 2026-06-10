// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api-integration/bugReportEndpoints", () => ({
  submitBugReport: vi.fn(),
}));

vi.mock("@/stores/outletStore", () => ({
  useOutletStore: (selector: (s: { activeOutletId: number }) => unknown) =>
    selector({ activeOutletId: 1 }),
}));

import { BugReportModal } from "./BugReportModal";

describe("BugReportScreenshotPreview", () => {
  it("renders preview image when screenshot is available", () => {
    render(
      <BugReportModal
        open
        onOpenChange={() => {}}
        screenshotPreview="data:image/webp;base64,shot"
        screenshotBlob={null}
        currentRoute="/inventory"
      />,
    );

    const img = screen.getByAltText(/screenshot preview/i);
    expect(img).toHaveAttribute("src", "data:image/webp;base64,shot");
  });

  it("shows fallback when screenshot is unavailable", () => {
    render(
      <BugReportModal
        open
        onOpenChange={() => {}}
        screenshotPreview={null}
        screenshotBlob={null}
        currentRoute="/inventory"
      />,
    );

    expect(screen.getByText(/screenshot capture unavailable/i)).toBeInTheDocument();
  });
});
