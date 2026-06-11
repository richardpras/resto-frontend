import {
  DEFAULT_SOUND_PREFERENCES,
  isWithinQuietHours,
  loadSoundAlertPreferences,
  saveSoundAlertPreferences,
  type SoundAlertPreferences,
} from "@/lib/sound/soundAlertPreferences";
import { showSoundAlertVisualFallback } from "@/lib/sound/soundAlertVisual";

export type SoundAlertType = "new_order" | "kitchen_ticket" | "critical_alert";

type SoundListener = (prefs: SoundAlertPreferences) => void;

const SOUND_PATHS: Record<SoundAlertType, { wav: string; mp3: string }> = {
  new_order: { wav: "/sounds/new-order.wav", mp3: "/sounds/new-order.mp3" },
  kitchen_ticket: { wav: "/sounds/kitchen-ticket.wav", mp3: "/sounds/kitchen-ticket.mp3" },
  critical_alert: { wav: "/sounds/critical-alert.wav", mp3: "/sounds/critical-alert.mp3" },
};

const DEBOUNCE_MS: Record<SoundAlertType, number> = {
  new_order: 3000,
  kitchen_ticket: 3000,
  critical_alert: 5000,
};

const SYNTH_PROFILE: Record<SoundAlertType, { freq: number; duration: number; repeat?: number }> = {
  new_order: { freq: 660, duration: 0.22 },
  kitchen_ticket: { freq: 880, duration: 0.18 },
  critical_alert: { freq: 520, duration: 0.16, repeat: 2 },
};

class SoundAlertService {
  private prefs: SoundAlertPreferences = loadSoundAlertPreferences();
  private listeners = new Set<SoundListener>();
  private audioByType = new Map<SoundAlertType, HTMLAudioElement>();
  private lastPlayedAt = new Map<SoundAlertType, number>();
  private audioContext: AudioContext | null = null;
  private unlockWarningShown = false;

  constructor() {
    if (typeof window !== "undefined") {
      this.preloadAll();
    }
  }

  subscribe(listener: SoundListener): () => void {
    this.listeners.add(listener);
    listener(this.prefs);
    return () => this.listeners.delete(listener);
  }

  private emit(): void {
    for (const listener of this.listeners) {
      listener(this.prefs);
    }
  }

  private persist(): void {
    saveSoundAlertPreferences(this.prefs);
    this.emit();
  }

  getPreferences(): SoundAlertPreferences {
    return this.prefs;
  }

  isUnlocked(): boolean {
    return this.prefs.unlocked;
  }

  isEnabled(): boolean {
    return this.prefs.enabled && this.prefs.unlocked && !this.prefs.muted;
  }

  canPlayNow(): boolean {
    if (!this.isEnabled()) return false;
    if (isWithinQuietHours(new Date(), this.prefs)) return false;
    return true;
  }

  setEnabled(enabled: boolean): void {
    this.prefs = { ...this.prefs, enabled };
    this.persist();
  }

  setMuted(muted: boolean): void {
    this.prefs = { ...this.prefs, muted };
    this.persist();
  }

  setVolume(volume: number): void {
    const clamped = Math.max(0, Math.min(1, volume));
    this.prefs = { ...this.prefs, volume: clamped };
    for (const audio of this.audioByType.values()) {
      audio.volume = clamped;
    }
    this.persist();
  }

  setQuietHours(enabled: boolean, start?: string, end?: string): void {
    this.prefs = {
      ...this.prefs,
      quietHoursEnabled: enabled,
      quietHoursStart: start ?? this.prefs.quietHoursStart,
      quietHoursEnd: end ?? this.prefs.quietHoursEnd,
    };
    this.persist();
  }

  dismissPrompt(hours = 24): void {
    this.prefs = {
      ...this.prefs,
      promptDismissedUntil: Date.now() + hours * 60 * 60 * 1000,
    };
    this.persist();
  }

  shouldShowPrompt(): boolean {
    if (this.prefs.unlocked) return false;
    if (this.prefs.promptDismissedUntil && Date.now() < this.prefs.promptDismissedUntil) return false;
    return true;
  }

  async unlock(): Promise<boolean> {
    try {
      await this.resumeAudioContext();
      const testPlayed = await this.playInternal("new_order", { force: true, skipDebounce: true });
      if (testPlayed) {
        this.prefs = { ...this.prefs, unlocked: true };
        this.persist();
        this.unlockWarningShown = false;
        return true;
      }
      this.maybeWarnUnlockFailed();
      return false;
    } catch {
      this.maybeWarnUnlockFailed();
      return false;
    }
  }

  async play(type: SoundAlertType, options?: { detail?: string; visualFallback?: boolean }): Promise<boolean> {
    const visualFallback = options?.visualFallback !== false;
    const canAudible = this.canPlayNow();

    if (!canAudible) {
      if (visualFallback) {
        showSoundAlertVisualFallback(type, options?.detail);
      }
      return false;
    }

    const played = await this.playInternal(type, { force: false, skipDebounce: false });

    if (played) return true;

    if (visualFallback) {
      showSoundAlertVisualFallback(type, options?.detail);
    }
    return false;
  }

  private maybeWarnUnlockFailed(): void {
    if (this.unlockWarningShown) return;
    this.unlockWarningShown = true;
    showSoundAlertVisualFallback("new_order", "Sound could not be enabled. Check browser audio permissions.");
  }

  private async resumeAudioContext(): Promise<void> {
    if (typeof window === "undefined") return;
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    if (!this.audioContext) {
      this.audioContext = new Ctx();
    }
    if (this.audioContext.state === "suspended") {
      await this.audioContext.resume();
    }
  }

  private preloadAll(): void {
    for (const type of Object.keys(SOUND_PATHS) as SoundAlertType[]) {
      void this.ensureAudio(type);
    }
  }

  private async ensureAudio(type: SoundAlertType): Promise<HTMLAudioElement | null> {
    const existing = this.audioByType.get(type);
    if (existing) return existing;

    const paths = SOUND_PATHS[type];
    for (const src of [paths.wav, paths.mp3]) {
      const audio = new Audio(src);
      audio.preload = "auto";
      audio.volume = this.prefs.volume;
      try {
        await new Promise<void>((resolve, reject) => {
          const onReady = () => {
            cleanup();
            resolve();
          };
          const onError = () => {
            cleanup();
            reject(new Error("load failed"));
          };
          const cleanup = () => {
            audio.removeEventListener("canplaythrough", onReady);
            audio.removeEventListener("error", onError);
          };
          audio.addEventListener("canplaythrough", onReady, { once: true });
          audio.addEventListener("error", onError, { once: true });
          try {
            audio.load();
          } catch {
            onError();
          }
        });
        this.audioByType.set(type, audio);
        return audio;
      } catch {
        // try next format
      }
    }
    return null;
  }

  private shouldDebounce(type: SoundAlertType): boolean {
    const last = this.lastPlayedAt.get(type) ?? 0;
    return Date.now() - last < DEBOUNCE_MS[type];
  }

  private async playInternal(
    type: SoundAlertType,
    opts: { force: boolean; skipDebounce: boolean },
  ): Promise<boolean> {
    if (!opts.force && !this.canPlayNow()) return false;
    if (!opts.skipDebounce && this.shouldDebounce(type)) return false;

    await this.resumeAudioContext();

    const audio = await this.ensureAudio(type);
    if (audio) {
      try {
        audio.currentTime = 0;
        audio.volume = this.prefs.volume;
        await audio.play();
        this.lastPlayedAt.set(type, Date.now());
        return true;
      } catch {
        // fall through to synthesis
      }
    }

    try {
      this.playSynthetic(type);
      this.lastPlayedAt.set(type, Date.now());
      return true;
    } catch {
      return false;
    }
  }

  private playSynthetic(type: SoundAlertType): void {
    if (!this.audioContext) {
      const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return;
      this.audioContext = new Ctx();
    }
    const ctx = this.audioContext;
    const profile = SYNTH_PROFILE[type];
    const gainLevel = this.prefs.volume * 0.12;
    const repeats = profile.repeat ?? 1;

    for (let r = 0; r < repeats; r++) {
      const startAt = ctx.currentTime + r * (profile.duration + 0.08);
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = profile.freq + r * 40;
      gain.gain.value = gainLevel;
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start(startAt);
      gain.gain.exponentialRampToValueAtTime(0.001, startAt + profile.duration);
      oscillator.stop(startAt + profile.duration + 0.02);
    }
  }

  /** Test helper */
  resetForTests(): void {
    this.prefs = { ...DEFAULT_SOUND_PREFERENCES };
    this.audioByType.clear();
    this.lastPlayedAt.clear();
    this.unlockWarningShown = false;
    if (this.audioContext) {
      void this.audioContext.close();
    }
    this.audioContext = null;
  }
}

export const soundAlertService = new SoundAlertService();
