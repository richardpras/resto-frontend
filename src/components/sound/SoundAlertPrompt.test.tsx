// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SoundAlertPrompt } from "./SoundAlertPrompt";
import { soundAlertService } from "@/lib/sound/soundAlertService";

vi.mock("@/stores/authStore", () => ({
  useAuthStore: (selector: (state: { user: { id: string } | null }) => unknown) =>
    selector({ user: { id: "1" } }),
}));

describe("SoundAlertPrompt", () => {
  beforeEach(() => {
    localStorage.clear();
    soundAlertService.resetForTests();
  });

  it("shows enable prompt when not unlocked", () => {
    render(<SoundAlertPrompt />);
    expect(screen.getByTestId("sound-alert-prompt")).toBeInTheDocument();
    expect(screen.getByText(/Enable sound alerts/i)).toBeInTheDocument();
  });

  it("calls unlock on Enable Sound click", async () => {
    const unlockSpy = vi.spyOn(soundAlertService, "unlock").mockResolvedValue(true);
    render(<SoundAlertPrompt />);
    fireEvent.click(screen.getByTestId("sound-alert-enable"));
    await waitFor(() => expect(unlockSpy).toHaveBeenCalled());
  });

  it("dismisses on Not now", () => {
    render(<SoundAlertPrompt />);
    fireEvent.click(screen.getByTestId("sound-alert-dismiss"));
    expect(screen.queryByTestId("sound-alert-prompt")).not.toBeInTheDocument();
  });
});
