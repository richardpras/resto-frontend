// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { soundAlertService } from "./soundAlertService";
import { loadSoundAlertPreferences } from "./soundAlertPreferences";

const playMock = vi.fn().mockResolvedValue(undefined);
const audioInstances: Array<{ play: typeof playMock; volume: number; src: string }> = [];

class MockAudio {
  volume = 1;
  currentTime = 0;
  preload = "";
  play = playMock;
  load = vi.fn();
  addEventListener = vi.fn((event: string, handler: () => void) => {
    if (event === "canplaythrough") {
      queueMicrotask(handler);
    }
  });
  removeEventListener = vi.fn();
  constructor(public src = "") {
    audioInstances.push({ play: this.play, volume: this.volume, src });
  }
}

describe("SoundAlertService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    audioInstances.length = 0;
    localStorage.clear();
    soundAlertService.resetForTests();
    // @ts-expect-error test mock
    global.Audio = MockAudio;
    playMock.mockResolvedValue(undefined);
  });

  it("requires unlock before isEnabled", () => {
    expect(soundAlertService.isUnlocked()).toBe(false);
    expect(soundAlertService.isEnabled()).toBe(false);
  });

  it("unlock marks preference and allows play", async () => {
    const ok = await soundAlertService.unlock();
    expect(ok).toBe(true);
    expect(soundAlertService.isUnlocked()).toBe(true);
    expect(loadSoundAlertPreferences().unlocked).toBe(true);
  });

  it("does not play when muted", async () => {
    await soundAlertService.unlock();
    soundAlertService.setMuted(true);
    const played = await soundAlertService.play("new_order", { visualFallback: false });
    expect(played).toBe(false);
    expect(playMock).toHaveBeenCalledTimes(1);
  });

  it("debounces repeated plays", async () => {
    await soundAlertService.unlock();
    await soundAlertService.play("kitchen_ticket", { visualFallback: false });
    await soundAlertService.play("kitchen_ticket", { visualFallback: false });
    expect(playMock.mock.calls.length).toBeLessThanOrEqual(2);
  });

  it("persists volume changes", () => {
    soundAlertService.setVolume(0.5);
    expect(loadSoundAlertPreferences().volume).toBe(0.5);
  });
});
