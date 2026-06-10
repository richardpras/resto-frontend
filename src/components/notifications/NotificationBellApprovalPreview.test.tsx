// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { NotificationPreviewRow } from "@/components/notifications/NotificationBell";
import { DropdownMenu, DropdownMenuContent } from "@/components/ui/dropdown-menu";
import type { UserNotification } from "@/lib/api-integration/notificationEndpoints";

const approvalItem: UserNotification = {
  id: 10,
  outletId: 1,
  userId: 1,
  severity: "info",
  sourceModule: "procurement",
  sourceType: "purchase_request_pending_approval",
  sourceId: "42",
  title: "Purchase request pending approval",
  message: "Purchase request PR-0042 is awaiting approval.",
  actionUrl: "/purchases?tab=requests&id=42",
  readAt: null,
  isRead: false,
  metadata: { workflow: "approval" },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

describe("NotificationBell approval preview", () => {
  it("renders approval row with open link", () => {
    render(
      <MemoryRouter>
        <DropdownMenu open>
          <DropdownMenuContent>
            <NotificationPreviewRow item={approvalItem} onMarkRead={vi.fn()} />
          </DropdownMenuContent>
        </DropdownMenu>
      </MemoryRouter>,
    );

    expect(screen.getByText("Purchase request pending approval")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Open" }).getAttribute("href")).toBe(
      "/purchases?tab=requests&id=42",
    );
  });
});
