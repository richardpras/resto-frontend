export type RealtimeChannel =
  | "payment"
  | "order"
  | "kitchen"
  | "qr"
  | "printer-telemetry"
  | (string & {});

export type RealtimeEnvelope<TPayload = unknown> = {
  id?: string;
  channel?: RealtimeChannel;
  topic?: RealtimeChannel;
  event?: string;
  type?: string;
  payload?: TPayload;
  data?: TPayload;
  occurredAt?: string;
  sequence?: number;
  seq?: number;
  version?: number;
  timestamp?: string;
  meta?: Record<string, unknown>;
};

export type RealtimeSubscription<TPayload = unknown> = {
  channel: RealtimeChannel;
  onEvent: (event: RealtimeEnvelope<TPayload>) => void;
};

export type RealtimeConnectionState = "idle" | "connecting" | "connected" | "reconnecting" | "disconnected";

type AdapterOptions = {
  name: string;
  reconnectBaseMs?: number;
  reconnectMaxMs?: number;
  wsFactory?: (url: string) => WebSocket;
  websocketUrl?: string;
};

type ConnectionListener = (state: RealtimeConnectionState) => void;

function resolveWebsocketUrl(explicit?: string): string {
  if (explicit) return explicit;
  const envUrl = (import.meta.env?.VITE_REALTIME_WS_URL as string | undefined) ?? "";
  return envUrl;
}

function normalizeEnvelope(raw: unknown): RealtimeEnvelope {
  if (!raw || typeof raw !== "object") return {};
  const candidate = raw as Record<string, unknown>;
  const rawChannel = (candidate.channel as RealtimeChannel) ?? (candidate.topic as RealtimeChannel);
  const channel = normalizeChannelAlias(rawChannel);
  const sequenceFromMeta =
    candidate.meta && typeof candidate.meta === "object" && typeof (candidate.meta as Record<string, unknown>).sequence === "number"
      ? ((candidate.meta as Record<string, unknown>).sequence as number)
      : undefined;
  return {
    id: typeof candidate.id === "string" ? candidate.id : (candidate.event_id as string | undefined),
    channel,
    topic: candidate.topic as RealtimeChannel | undefined,
    event: (candidate.event as string | undefined) ?? (candidate.type as string | undefined),
    type: candidate.type as string | undefined,
    payload: candidate.payload ?? candidate.data,
    data: candidate.data ?? candidate.payload,
    occurredAt: typeof candidate.occurredAt === "string" ? candidate.occurredAt : undefined,
    sequence:
      typeof candidate.sequence === "number"
        ? candidate.sequence
        : typeof candidate.seq === "number"
          ? candidate.seq
          : sequenceFromMeta,
    seq: typeof candidate.seq === "number" ? candidate.seq : undefined,
    version: typeof candidate.version === "number" ? candidate.version : undefined,
    timestamp:
      typeof candidate.timestamp === "string"
        ? candidate.timestamp
        : typeof candidate.occurredAt === "string"
          ? candidate.occurredAt
          : typeof candidate.occurred_at === "string"
            ? candidate.occurred_at
            : undefined,
    meta:
      (candidate.meta as Record<string, unknown> | undefined) ??
      (candidate.payload &&
      typeof candidate.payload === "object" &&
      typeof (candidate.payload as Record<string, unknown>).meta === "object"
        ? ((candidate.payload as Record<string, unknown>).meta as Record<string, unknown>)
        : undefined),
  };
}

function normalizeChannelAlias(channel: RealtimeChannel | undefined): RealtimeChannel | undefined {
  if (typeof channel !== "string") return channel;
  if (channel === "order" || channel.endsWith(".orders")) return "order";
  if (channel === "payment" || channel.endsWith(".payments")) return "payment";
  if (channel === "qr" || channel.endsWith(".qr-orders")) return "qr";
  if (channel === "kitchen" || channel.endsWith(".kitchen")) return "kitchen";
  return channel;
}

export class RealtimeAdapter {
  private readonly name: string;
  private readonly reconnectBaseMs: number;
  private readonly reconnectMaxMs: number;
  private readonly wsFactory: (url: string) => WebSocket;
  private readonly websocketUrl: string;
  private socket: WebSocket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts = 0;
  private subscriptions = new Map<RealtimeChannel, Set<(event: RealtimeEnvelope) => void>>();
  private connectionListeners = new Set<ConnectionListener>();
  private state: RealtimeConnectionState = "idle";
  private manuallyClosed = false;

  constructor(options: AdapterOptions) {
    this.name = options.name;
    this.reconnectBaseMs = options.reconnectBaseMs ?? 750;
    this.reconnectMaxMs = options.reconnectMaxMs ?? 15000;
    this.wsFactory = options.wsFactory ?? ((url) => new WebSocket(url));
    this.websocketUrl = resolveWebsocketUrl(options.websocketUrl);
  }

  connect(): void {
    if (!this.websocketUrl) return;
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return;
    }
    this.manuallyClosed = false;
    this.transition(this.reconnectAttempts > 0 ? "reconnecting" : "connecting");
    try {
      const socket = this.wsFactory(this.websocketUrl);
      this.socket = socket;
      socket.onopen = () => {
        this.reconnectAttempts = 0;
        this.transition("connected");
      };
      socket.onmessage = (message) => {
        this.handleMessage(message.data);
      };
      socket.onerror = () => {
        // Keep passive: close handler performs reconnect logic.
      };
      socket.onclose = () => {
        this.socket = null;
        if (!this.manuallyClosed) {
          this.transition("reconnecting");
          this.scheduleReconnect();
          return;
        }
        this.transition("disconnected");
      };
    } catch {
      this.scheduleReconnect();
    }
  }

  disconnect(): void {
    this.manuallyClosed = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.transition("disconnected");
  }

  subscribe<TPayload = unknown>(subscription: RealtimeSubscription<TPayload>): () => void {
    const handlers = this.subscriptions.get(subscription.channel) ?? new Set();
    const cb = subscription.onEvent as (event: RealtimeEnvelope) => void;
    handlers.add(cb);
    this.subscriptions.set(subscription.channel, handlers);
    return () => {
      const setForChannel = this.subscriptions.get(subscription.channel);
      if (!setForChannel) return;
      setForChannel.delete(cb);
      if (setForChannel.size === 0) {
        this.subscriptions.delete(subscription.channel);
      }
    };
  }

  unsubscribeAll(channel?: RealtimeChannel): void {
    if (!channel) {
      this.subscriptions.clear();
      return;
    }
    this.subscriptions.delete(channel);
  }

  onConnectionStateChange(listener: ConnectionListener): () => void {
    this.connectionListeners.add(listener);
    listener(this.state);
    return () => {
      this.connectionListeners.delete(listener);
    };
  }

  getConnectionState(): RealtimeConnectionState {
    return this.state;
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer || this.manuallyClosed) return;
    const jitter = Math.floor(Math.random() * 125);
    const timeout = Math.min(
      this.reconnectMaxMs,
      this.reconnectBaseMs * 2 ** Math.max(0, this.reconnectAttempts),
    ) + jitter;
    this.reconnectAttempts += 1;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, timeout);
  }

  private transition(next: RealtimeConnectionState): void {
    if (this.state === next) return;
    this.state = next;
    for (const listener of this.connectionListeners) {
      listener(next);
    }
  }

  private handleMessage(rawData: unknown): void {
    if (typeof rawData !== "string") return;
    try {
      const parsed = JSON.parse(rawData) as unknown;
      const envelope = normalizeEnvelope(parsed);
      const channel = envelope.channel;
      if (!channel) return;
      const handlers = this.subscriptions.get(channel);
      if (!handlers || handlers.size === 0) return;
      handlers.forEach((handler) => handler(envelope));
    } catch {
      // Ignore malformed messages to keep polling fallback intact.
    }
  }
}

const adapterRegistry = new Map<string, RealtimeAdapter>();

export function getRealtimeAdapter(name: string): RealtimeAdapter {
  const existing = adapterRegistry.get(name);
  if (existing) return existing;
  const created = new RealtimeAdapter({ name });
  adapterRegistry.set(name, created);
  return created;
}

export function __clearRealtimeAdapterRegistryForTests(): void {
  adapterRegistry.clear();
}
