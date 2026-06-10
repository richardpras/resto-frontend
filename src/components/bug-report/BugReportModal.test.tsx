// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const mockSubmit = vi.fn().mockResolvedValue({ id: 1, title: "Test" });

vi.mock("@/lib/api-integration/bugReportEndpoints", () => ({
  submitBugReport: (...args: unknown[]) => mockSubmit(...args),
}));

vi.mock("@/stores/outletStore", () => ({
  useOutletStore: (selector: (s: { activeOutletId: number }) => unknown) =>
    selector({ activeOutletId: 1 }),
}));

import { BugReportModal } from "./BugReportModal";

describe("BugReportModal", () => {
  it("shows screenshot preview and submits title/message", async () => {
    const onOpenChange = vi.fn();

    render(
      <BugReportModal
        open
        onOpenChange={onOpenChange}
        screenshotPreview="data:image/webp;base64,preview"
        screenshotBlob={new Blob(["x"], { type: "image/webp" })}
        currentRoute="/pos"
      />,
    );

    expect(screen.getByAltText(/screenshot preview/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/title/i), { target: { value: "POS crash" } });
    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: "Payment modal stuck" } });
    fireEvent.click(screen.getByRole("button", { name: /submit report/i }));

    await waitFor(() => {
      expect(mockSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "POS crash",
          message: "Payment modal stuck",
          currentRoute: "/pos",
        }),
      );
    });
  });
});
