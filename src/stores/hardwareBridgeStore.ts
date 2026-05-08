import { create } from "zustand";
import {
  ackHardwareBridgeCommand,
  closeHardwareBridgeSession,
  enqueueHardwareBridgeCommand,
  listHardwareBridgeDevices,
  nackHardwareBridgeCommand,
  openHardwareBridgeSession,
  type EnqueueHardwareBridgeCommandPayload,
  type HardwareBridgeCommandAckPayload,
  type OpenHardwareBridgeSessionPayload,
} from "@/lib/api-integration/hardwareBridgeEndpoints";
import {
  mapHardwareBridgeCommandApiToModel,
  mapHardwareBridgeDeviceApiToModel,
  mapHardwareBridgeSessionApiToModel,
  type HardwareBridgeDevice,
  type HardwareBridgeHealthState,
  type HardwareBridgeHeartbeatState,
  type HardwareBridgeReconnectState,
  type HardwareBridgeProvisioningState,
  type HardwareBridgeRuntimeCapabilities,
  type HardwareBridgeRuntimeDeploymentState,
  type HardwareBridgeRuntimeState,
  type HardwareBridgeSpoolHealth,
  type HardwareBridgeWatchdogState,
} from "@/domain/hardwareBridgeAdapters";
import {
  getRealtimeAdapter,
  type RealtimeConnectionState,
  type RealtimeEnvelope,
} from "@/domain/realtimeAdapter";

const HEALTHY_HEARTBEAT_MS = 90_000;
const STALE_HEARTBEAT_MS = 300_000;

type HardwareBridgeStore = {
  monitoredOutletId: number | null;
  devices: HardwareBridgeDevice[];
  bridgeStatus: HardwareBridgeHealthState;
  heartbeatState: HardwareBridgeHeartbeatState;
  reconnectState: HardwareBridgeReconnectState;
  lastSessionStatus: string | null;
  lastCommandStatus: string | null;
  isLoading: boolean;
  error: string | null;
  lastSyncAt: string | null;
  pollingActive: boolean;
  pollingTimer: ReturnType<typeof setInterval> | null;
  realtimeState: RealtimeConnectionState;
  realtimeTransport: "polling" | "websocket";
  lastRealtimeSeq: number;
  lastRealtimeMarker: string | null;
  runtimeState: HardwareBridgeRuntimeState;
  runtimeCapabilities: HardwareBridgeRuntimeCapabilities;
  spoolHealth: HardwareBridgeSpoolHealth;
  executionLifecycle: {
    queued: number;
    executing: number;
    acknowledged: number;
    failed: number;
    retryPending: number;
    deadLetter: number;
  };
  provisioning: HardwareBridgeProvisioningState;
  watchdog: HardwareBridgeWatchdogState;
  runtime: HardwareBridgeRuntimeDeploymentState;
  realtimeUnsubscribe: (() => void) | null;
  realtimeConnectionUnsubscribe: (() => void) | null;
  fetchSnapshot: (outletId: number) => Promise<void>;
  startRealtime: () => void;
  stopRealtime: () => void;
  startMonitoring: (outletId: number, intervalMs?: number) => Promise<void>;
  stopMonitoring: () => void;
  openSession: (payload: OpenHardwareBridgeSessionPayload) => Promise<void>;
  closeSession: (sessionId: number, reason?: string) => Promise<void>;
  enqueueCommand: (payload: EnqueueHardwareBridgeCommandPayload) => Promise<void>;
  ackCommand: (commandId: number, payload?: HardwareBridgeCommandAckPayload) => Promise<void>;
  nackCommand: (commandId: number, payload?: HardwareBridgeCommandAckPayload) => Promise<void>;
  reset: () => void;
};

function extractRealtimeSeq(event: RealtimeEnvelope): number {
  return event.sequence ?? event.seq ?? event.version ?? 0;
}

function extractRealtimeMarker(event: RealtimeEnvelope): string | null {
  if (typeof event.timestamp === "string" && event.timestamp.trim()) return event.timestamp;
  const marker = event.meta?.marker;
  if (typeof marker === "string" && marker.trim()) return marker;
  return null;
}

function emptyRuntimeCapabilities(): HardwareBridgeRuntimeCapabilities {
  return { transports: ["polling"], capabilities: [], spoolSupported: false };
}

function emptySpoolHealth(): HardwareBridgeSpoolHealth {
  return { queueDepth: 0, deadLetterCount: 0, avgAckLatencyMs: 0, retryCount: 0 };
}

function emptyExecutionLifecycle() {
  return {
    queued: 0,
    executing: 0,
    acknowledged: 0,
    failed: 0,
    retryPending: 0,
    deadLetter: 0,
  };
}

function emptyProvisioningState(): HardwareBridgeProvisioningState {
  return {
    status: "unpaired",
    pairedOutletIdentity: null,
    pairedDeviceIdentity: null,
    deviceFingerprint: null,
    tokenHealth: "unknown",
    tokenRotationDue: false,
  };
}

function emptyWatchdogState(): HardwareBridgeWatchdogState {
  return {
    state: "healthy",
    restartCount: 0,
    crashCount: 0,
    stalledSpoolDetected: false,
    freezeDetected: false,
  };
}

function emptyRuntimeDeploymentState(): HardwareBridgeRuntimeDeploymentState {
  return {
    version: "unknown",
    deploymentMode: "headless",
    serviceMode: "unknown",
    trayMode: "unknown",
    updateChannel: "stable",
    updateAvailable: false,
    updateTargetVersion: null,
    updateRestartRequired: false,
  };
}

function deriveRuntimeMetadata(devices: HardwareBridgeDevice[]) {
  const first = devices[0];
  const metadata = (first?.metadata ?? {}) as Record<string, unknown>;
  const provisioning = (metadata.provisioning ?? {}) as Record<string, unknown>;
  const auth = (metadata.auth ?? {}) as Record<string, unknown>;
  const tokenHealth = (auth.tokenHealth ?? {}) as Record<string, unknown>;
  const rotation = (auth.rotation ?? {}) as Record<string, unknown>;
  const watchdogMeta = (metadata.watchdog ?? {}) as Record<string, unknown>;
  const deployment = (metadata.deployment ?? {}) as Record<string, unknown>;
  const updates = (metadata.updates ?? {}) as Record<string, unknown>;
  return {
    provisioning: {
      status: String(provisioning.status ?? (provisioning.pairingTokenRef ? "paired" : "unpaired")),
      pairedOutletIdentity: provisioning.pairedOutletId ? String(provisioning.pairedOutletId) : null,
      pairedDeviceIdentity: first?.deviceKey ?? null,
      deviceFingerprint: typeof auth.deviceFingerprint === "string" ? auth.deviceFingerprint : null,
      tokenHealth: String(tokenHealth.status ?? "unknown"),
      tokenRotationDue: Boolean(rotation.rotationDue ?? false),
    } satisfies HardwareBridgeProvisioningState,
    watchdog: {
      state: String(watchdogMeta.state ?? "healthy"),
      restartCount: Number(watchdogMeta.restartCount ?? 0),
      crashCount: Number(watchdogMeta.crashCount ?? 0),
      stalledSpoolDetected: Boolean(watchdogMeta.stalledSpoolDetected ?? false),
      freezeDetected: Boolean(watchdogMeta.freezeDetected ?? false),
    } satisfies HardwareBridgeWatchdogState,
    runtime: {
      version: String(metadata.runtimeVersion ?? "unknown"),
      deploymentMode: String(deployment.deploymentMode ?? "headless"),
      serviceMode: String(deployment.serviceMode ?? "unknown"),
      trayMode: String(deployment.trayMode ?? "unknown"),
      updateChannel: String(updates.channel ?? "stable"),
      updateAvailable: Boolean(updates.available ?? false),
      updateTargetVersion: updates.targetVersion ? String(updates.targetVersion) : null,
      updateRestartRequired: Boolean(updates.restartRequired ?? false),
    } satisfies HardwareBridgeRuntimeDeploymentState,
  };
}

function asRuntimeState(value: unknown): HardwareBridgeRuntimeState | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  if (
    normalized === "connected" ||
    normalized === "disconnected" ||
    normalized === "reconnecting" ||
    normalized === "stale" ||
    normalized === "recovering" ||
    normalized === "degraded"
  ) {
    return normalized;
  }
  return null;
}

function mapConnectionStateToRuntimeState(state: RealtimeConnectionState): HardwareBridgeRuntimeState {
  if (state === "connected") return "connected";
  if (state === "reconnecting") return "reconnecting";
  if (state === "disconnected") return "disconnected";
  return "degraded";
}

function deriveRuntimeCapabilities(
  devices: HardwareBridgeDevice[],
  incoming: Partial<HardwareBridgeRuntimeCapabilities> | null | undefined,
): HardwareBridgeRuntimeCapabilities {
  const capabilitySet = new Set<string>();
  const transports = new Set<string>(incoming?.transports ?? ["polling"]);
  let spoolSupported = Boolean(incoming?.spoolSupported);

  for (const capability of incoming?.capabilities ?? []) capabilitySet.add(String(capability));

  for (const device of devices) {
    if (!device.capabilities || typeof device.capabilities !== "object") continue;
    for (const [name, value] of Object.entries(device.capabilities)) {
      if (value === true) capabilitySet.add(name);
      if (name.toLowerCase().includes("spool") && Boolean(value)) spoolSupported = true;
    }
  }

  return {
    transports: Array.from(transports) as Array<"websocket" | "polling" | string>,
    capabilities: Array.from(capabilitySet),
    spoolSupported,
  };
}

function deriveRuntimeState(
  realtimeState: RealtimeConnectionState,
  bridgeStatus: HardwareBridgeHealthState,
  reconnectState: HardwareBridgeReconnectState,
  explicitState: HardwareBridgeRuntimeState | null,
): HardwareBridgeRuntimeState {
  if (explicitState) return explicitState;
  if (realtimeState === "reconnecting") return "reconnecting";
  if (reconnectState === "recovering") return "recovering";
  if (bridgeStatus === "stale") return "stale";
  if (bridgeStatus === "offline") return "disconnected";
  return realtimeState === "connected" ? "connected" : "degraded";
}

function shouldSuppressRealtimeEvent(
  incomingSeq: number,
  incomingMarker: string | null,
  state: Pick<HardwareBridgeStore, "lastRealtimeSeq" | "lastRealtimeMarker">,
): boolean {
  if (incomingSeq > 0 && incomingSeq < state.lastRealtimeSeq) return true;
  if (incomingSeq > 0 && incomingSeq > state.lastRealtimeSeq) return false;
  if (!incomingMarker) return incomingSeq > 0 && incomingSeq <= state.lastRealtimeSeq;
  if (!state.lastRealtimeMarker) return false;
  const incomingMarkerEpoch = new Date(incomingMarker).getTime();
  const knownMarkerEpoch = new Date(state.lastRealtimeMarker).getTime();
  if (Number.isNaN(incomingMarkerEpoch) || Number.isNaN(knownMarkerEpoch)) return false;
  return incomingMarkerEpoch <= knownMarkerEpoch;
}

function deriveHealth(
  devices: HardwareBridgeDevice[],
): Pick<HardwareBridgeStore, "bridgeStatus" | "heartbeatState" | "reconnectState"> {
  if (devices.length === 0) {
    return { bridgeStatus: "offline", heartbeatState: "missing", reconnectState: "stable" };
  }
  const now = Date.now();
  const allDisabled = devices.every((device) => device.disabledAt || device.status === "disabled" || device.revokedAt);
  if (allDisabled) {
    return { bridgeStatus: "disabled", heartbeatState: "missing", reconnectState: "stable" };
  }
  const reconnectCount = devices.reduce((total, item) => total + item.reconnectCount, 0);
  const latestSeenAt = devices.reduce<number | null>((latest, item) => {
    if (!item.lastSeenAt) return latest;
    const epoch = new Date(item.lastSeenAt).getTime();
    if (Number.isNaN(epoch)) return latest;
    if (latest === null || epoch > latest) return epoch;
    return latest;
  }, null);
  if (latestSeenAt === null) {
    return {
      bridgeStatus: "offline",
      heartbeatState: "missing",
      reconnectState: reconnectCount > 0 ? "recovering" : "stable",
    };
  }
  const age = Math.max(0, now - latestSeenAt);
  if (age <= HEALTHY_HEARTBEAT_MS) {
    return {
      bridgeStatus: "online",
      heartbeatState: "healthy",
      reconnectState: reconnectCount > 0 ? "recovering" : "stable",
    };
  }
  if (age <= STALE_HEARTBEAT_MS) {
    return {
      bridgeStatus: "stale",
      heartbeatState: "delayed",
      reconnectState: reconnectCount > 0 ? "recovering" : "stable",
    };
  }
  return {
    bridgeStatus: "offline",
    heartbeatState: "missing",
    reconnectState: reconnectCount > 0 ? "recovering" : "stable",
  };
}

function mapError(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "Hardware bridge request failed";
}

export const useHardwareBridgeStore = create<HardwareBridgeStore>((set, get) => ({
  monitoredOutletId: null,
  devices: [],
  bridgeStatus: "offline",
  heartbeatState: "missing",
  reconnectState: "stable",
  lastSessionStatus: null,
  lastCommandStatus: null,
  isLoading: false,
  error: null,
  lastSyncAt: null,
  pollingActive: false,
  pollingTimer: null,
  realtimeState: "idle",
  realtimeTransport: "polling",
  lastRealtimeSeq: 0,
  lastRealtimeMarker: null,
  runtimeState: "disconnected",
  runtimeCapabilities: emptyRuntimeCapabilities(),
  spoolHealth: emptySpoolHealth(),
  executionLifecycle: emptyExecutionLifecycle(),
  provisioning: emptyProvisioningState(),
  watchdog: emptyWatchdogState(),
  runtime: emptyRuntimeDeploymentState(),
  realtimeUnsubscribe: null,
  realtimeConnectionUnsubscribe: null,

  fetchSnapshot: async (outletId) => {
    set({ isLoading: true, error: null, monitoredOutletId: outletId });
    try {
      const devices = (await listHardwareBridgeDevices(outletId)).map(mapHardwareBridgeDeviceApiToModel);
      const health = deriveHealth(devices);
      const runtimeCapabilities = deriveRuntimeCapabilities(devices, null);
      const runtimeState = deriveRuntimeState(get().realtimeState, health.bridgeStatus, health.reconnectState, null);
      const metadataState = deriveRuntimeMetadata(devices);
      set({
        devices,
        ...health,
        runtimeState,
        runtimeCapabilities,
        provisioning: metadataState.provisioning,
        watchdog: metadataState.watchdog,
        runtime: metadataState.runtime,
        lastSyncAt: new Date().toISOString(),
      });
    } catch (error) {
      set({ error: mapError(error) });
    } finally {
      set({ isLoading: false });
    }
  },

  startRealtime: () => {
    if (get().realtimeUnsubscribe) return;
    const adapter = getRealtimeAdapter("printer-telemetry");
    const connectionUnsubscribe = adapter.onConnectionStateChange((state) => {
      set((current) => ({
        realtimeState: state,
        realtimeTransport: state === "connected" ? "websocket" : "polling",
        runtimeState: mapConnectionStateToRuntimeState(state),
        runtimeCapabilities: {
          ...current.runtimeCapabilities,
          transports: state === "connected" ? ["websocket", "polling"] : ["polling"],
        },
        reconnectState:
          state === "reconnecting"
            ? "reconnecting"
            : current.reconnectState === "reconnecting"
              ? "stable"
              : current.reconnectState,
      }));
    });
    const unsubscribe = adapter.subscribe({
      channel: "printer-telemetry",
      onEvent: (event) => {
        const state = get();
        const payload = (event.payload ?? event.data) as
          | {
              outletId?: number;
              devices?: unknown[];
              bridgeStatus?: HardwareBridgeHealthState;
              runtimeState?: HardwareBridgeRuntimeState;
              runtimeCapabilities?: Partial<HardwareBridgeRuntimeCapabilities>;
              spoolHealth?: Partial<HardwareBridgeSpoolHealth>;
              executionLifecycle?: Partial<HardwareBridgeStore["executionLifecycle"]>;
              sessionStatus?: string;
              commandStatus?: string;
            }
          | undefined;
        if (!payload) return;
        if (state.monitoredOutletId && payload.outletId && payload.outletId !== state.monitoredOutletId) return;
        const incomingSeq = extractRealtimeSeq(event);
        const incomingMarker = extractRealtimeMarker(event);
        if (shouldSuppressRealtimeEvent(incomingSeq, incomingMarker, state)) return;

        const devices = Array.isArray(payload.devices)
          ? payload.devices.map((device) => mapHardwareBridgeDeviceApiToModel(device as never))
          : state.devices;
        const health = deriveHealth(devices);
        const bridgeStatus = payload.bridgeStatus ?? health.bridgeStatus;
        const reconnectState = state.realtimeState === "reconnecting" ? "reconnecting" : health.reconnectState;
        const runtimeState = deriveRuntimeState(
          state.realtimeState,
          bridgeStatus,
          reconnectState,
          asRuntimeState(payload.runtimeState),
        );
        const runtimeCapabilities = deriveRuntimeCapabilities(devices, payload.runtimeCapabilities);
        const spoolHealth = {
          queueDepth: Number(payload.spoolHealth?.queueDepth ?? state.spoolHealth.queueDepth),
          deadLetterCount: Number(payload.spoolHealth?.deadLetterCount ?? state.spoolHealth.deadLetterCount),
          avgAckLatencyMs: Number(payload.spoolHealth?.avgAckLatencyMs ?? state.spoolHealth.avgAckLatencyMs),
          retryCount: Number(payload.spoolHealth?.retryCount ?? state.spoolHealth.retryCount),
        };
        const executionLifecycle = {
          queued: Number(payload.executionLifecycle?.queued ?? state.executionLifecycle.queued),
          executing: Number(payload.executionLifecycle?.executing ?? state.executionLifecycle.executing),
          acknowledged: Number(payload.executionLifecycle?.acknowledged ?? state.executionLifecycle.acknowledged),
          failed: Number(payload.executionLifecycle?.failed ?? state.executionLifecycle.failed),
          retryPending: Number(payload.executionLifecycle?.retryPending ?? state.executionLifecycle.retryPending),
          deadLetter: Number(payload.executionLifecycle?.deadLetter ?? state.executionLifecycle.deadLetter),
        };
        const metadataState = deriveRuntimeMetadata(devices);
        set({
          devices,
          bridgeStatus,
          heartbeatState: health.heartbeatState,
          reconnectState,
          runtimeState,
          runtimeCapabilities,
          spoolHealth,
          executionLifecycle,
          provisioning: metadataState.provisioning,
          watchdog: metadataState.watchdog,
          runtime: metadataState.runtime,
          lastSessionStatus: payload.sessionStatus ?? state.lastSessionStatus,
          lastCommandStatus: payload.commandStatus ?? state.lastCommandStatus,
          lastRealtimeSeq: incomingSeq > 0 ? incomingSeq : state.lastRealtimeSeq,
          lastRealtimeMarker: incomingMarker ?? state.lastRealtimeMarker,
          lastSyncAt: new Date().toISOString(),
        });
      },
    });
    set({ realtimeUnsubscribe: unsubscribe, realtimeConnectionUnsubscribe: connectionUnsubscribe });
    adapter.connect();
  },

  stopRealtime: () => {
    get().realtimeUnsubscribe?.();
    get().realtimeConnectionUnsubscribe?.();
    const adapter = getRealtimeAdapter("printer-telemetry");
    adapter.disconnect();
    set({
      realtimeUnsubscribe: null,
      realtimeConnectionUnsubscribe: null,
      realtimeState: "disconnected",
      realtimeTransport: "polling",
      lastRealtimeSeq: 0,
      lastRealtimeMarker: null,
      runtimeState: "disconnected",
      runtimeCapabilities: emptyRuntimeCapabilities(),
      spoolHealth: emptySpoolHealth(),
      executionLifecycle: emptyExecutionLifecycle(),
    });
  },

  startMonitoring: async (outletId, intervalMs = 5000) => {
    get().stopMonitoring();
    set({ monitoredOutletId: outletId });
    get().startRealtime();
    await get().fetchSnapshot(outletId);
    const pollingTimer = setInterval(() => {
      void get().fetchSnapshot(outletId);
    }, intervalMs);
    set({ pollingTimer, pollingActive: true });
  },

  stopMonitoring: () => {
    if (get().pollingTimer) clearInterval(get().pollingTimer as ReturnType<typeof setInterval>);
    set({ pollingTimer: null, pollingActive: false });
    get().stopRealtime();
  },

  openSession: async (payload) => {
    set({ error: null });
    try {
      const session = mapHardwareBridgeSessionApiToModel(await openHardwareBridgeSession(payload));
      set({
        monitoredOutletId: payload.outletId,
        lastSessionStatus: session.status,
        lastSyncAt: new Date().toISOString(),
      });
    } catch (error) {
      set({ error: mapError(error) });
      throw error;
    }
  },

  closeSession: async (sessionId, reason) => {
    set({ error: null });
    try {
      const session = mapHardwareBridgeSessionApiToModel(await closeHardwareBridgeSession(sessionId, { reason }));
      set({ lastSessionStatus: session.status, lastSyncAt: new Date().toISOString() });
    } catch (error) {
      set({ error: mapError(error) });
      throw error;
    }
  },

  enqueueCommand: async (payload) => {
    set({ error: null, monitoredOutletId: payload.outletId });
    try {
      const command = mapHardwareBridgeCommandApiToModel(await enqueueHardwareBridgeCommand(payload));
      set({ lastCommandStatus: command.status, lastSyncAt: new Date().toISOString() });
    } catch (error) {
      set({ error: mapError(error) });
      throw error;
    }
  },

  ackCommand: async (commandId, payload) => {
    set({ error: null });
    try {
      const command = mapHardwareBridgeCommandApiToModel(await ackHardwareBridgeCommand(commandId, payload));
      set({ lastCommandStatus: command.status, lastSyncAt: new Date().toISOString() });
    } catch (error) {
      set({ error: mapError(error) });
      throw error;
    }
  },

  nackCommand: async (commandId, payload) => {
    set({ error: null });
    try {
      const command = mapHardwareBridgeCommandApiToModel(await nackHardwareBridgeCommand(commandId, payload));
      set({ lastCommandStatus: command.status, lastSyncAt: new Date().toISOString() });
    } catch (error) {
      set({ error: mapError(error) });
      throw error;
    }
  },

  reset: () => {
    get().stopMonitoring();
    set({
      monitoredOutletId: null,
      devices: [],
      bridgeStatus: "offline",
      heartbeatState: "missing",
      reconnectState: "stable",
      lastSessionStatus: null,
      lastCommandStatus: null,
      isLoading: false,
      error: null,
      lastSyncAt: null,
      pollingActive: false,
      pollingTimer: null,
      realtimeState: "idle",
      realtimeTransport: "polling",
      lastRealtimeSeq: 0,
      lastRealtimeMarker: null,
      runtimeState: "disconnected",
      runtimeCapabilities: emptyRuntimeCapabilities(),
      spoolHealth: emptySpoolHealth(),
      executionLifecycle: emptyExecutionLifecycle(),
      provisioning: emptyProvisioningState(),
      watchdog: emptyWatchdogState(),
      runtime: emptyRuntimeDeploymentState(),
      realtimeUnsubscribe: null,
      realtimeConnectionUnsubscribe: null,
    });
  },
}));
