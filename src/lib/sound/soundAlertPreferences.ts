export type SoundAlertPreferences = {
  enabled: boolean;
  unlocked: boolean;
  muted: boolean;
  volume: number;
  promptDismissedUntil: number | null;
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
};

const STORAGE_KEY = "resto.sound-alerts.v1";

export const DEFAULT_SOUND_PREFERENCES: SoundAlertPreferences = {
  enabled: true,
  unlocked: false,
  muted: false,
  volume: 0.85,
  promptDismissedUntil: null,
  quietHoursEnabled: false,
  quietHoursStart: "22:00",
  quietHoursEnd: "06:00",
};

export function loadSoundAlertPreferences(): SoundAlertPreferences {
  if (typeof window === "undefined") return { ...DEFAULT_SOUND_PREFERENCES };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SOUND_PREFERENCES };
    const parsed = JSON.parse(raw) as Partial<SoundAlertPreferences>;
    return {
      ...DEFAULT_SOUND_PREFERENCES,
      ...parsed,
      volume:
        typeof parsed.volume === "number" && parsed.volume >= 0 && parsed.volume <= 1
          ? parsed.volume
          : DEFAULT_SOUND_PREFERENCES.volume,
    };
  } catch {
    return { ...DEFAULT_SOUND_PREFERENCES };
  }
}

export function saveSoundAlertPreferences(prefs: SoundAlertPreferences): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // ignore quota errors
  }
}

export function isWithinQuietHours(now: Date, prefs: SoundAlertPreferences): boolean {
  if (!prefs.quietHoursEnabled) return false;
  const [startH, startM] = prefs.quietHoursStart.split(":").map(Number);
  const [endH, endM] = prefs.quietHoursEnd.split(":").map(Number);
  if ([startH, startM, endH, endM].some((n) => Number.isNaN(n))) return false;

  const minutes = now.getHours() * 60 + now.getMinutes();
  const start = startH * 60 + startM;
  const end = endH * 60 + endM;

  if (start === end) return false;
  if (start < end) return minutes >= start && minutes < end;
  return minutes >= start || minutes < end;
}
