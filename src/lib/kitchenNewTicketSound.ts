export type TicketsUpdateSource = "fetch" | "realtime" | "mutation";

/**
 * Returns queued ticket ids that should trigger a one-time new-order chime.
 * Skips initial fetch hydration and polling-only updates.
 */
export function collectNewQueuedTicketIdsForSound(params: {
  tickets: Array<{ id: string; status: string }>;
  source: TicketsUpdateSource;
  alreadyNotifiedIds: ReadonlySet<string>;
  hasInitialized: boolean;
}): string[] {
  const { tickets, source, alreadyNotifiedIds, hasInitialized } = params;

  if (!hasInitialized) {
    return [];
  }
  if (source !== "realtime") {
    return [];
  }

  return tickets
    .filter((ticket) => ticket.status === "queued" && !alreadyNotifiedIds.has(ticket.id))
    .map((ticket) => ticket.id);
}

/**
 * Returns ticket ids that newly reached READY via realtime (one chime per id).
 */
export function collectNewReadyTicketIdsForSound(params: {
  tickets: Array<{ id: string; status: string }>;
  source: TicketsUpdateSource;
  alreadyReadyNotifiedIds: ReadonlySet<string>;
  hasInitialized: boolean;
}): string[] {
  const { tickets, source, alreadyReadyNotifiedIds, hasInitialized } = params;

  if (!hasInitialized || source !== "realtime") {
    return [];
  }

  return tickets
    .filter((ticket) => ticket.status === "ready" && !alreadyReadyNotifiedIds.has(ticket.id))
    .map((ticket) => ticket.id);
}

export function markInitializedSoundBaseline(
  tickets: Array<{ id: string; status: string }>,
  queuedIds: Set<string>,
  readyIds: Set<string>,
): void {
  for (const ticket of tickets) {
    if (ticket.status === "queued") {
      queuedIds.add(ticket.id);
    }
    if (ticket.status === "ready") {
      readyIds.add(ticket.id);
    }
  }
}

let audioContext: AudioContext | null = null;

function playTone(frequency: number, durationSec: number, gainLevel = 0.08): void {
  if (typeof window === "undefined") return;

  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;

    if (!audioContext) {
      audioContext = new Ctx();
    }
    if (audioContext.state === "suspended") {
      void audioContext.resume();
    }

    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = frequency;
    gain.gain.value = gainLevel;
    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    const now = audioContext.currentTime;
    oscillator.start(now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + durationSec);
    oscillator.stop(now + durationSec + 0.02);
  } catch {
    // Audio is best-effort; silence failures in restricted environments.
  }
}

export function playKitchenNewTicketChime(): void {
  playTone(880, 0.18);
}

export function playKitchenReadyChime(): void {
  playTone(523, 0.12);
  window.setTimeout(() => playTone(784, 0.14, 0.07), 120);
}

export function resetKitchenNewTicketSoundForTests(): void {
  if (audioContext) {
    void audioContext.close();
  }
  audioContext = null;
}
