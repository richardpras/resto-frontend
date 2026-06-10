export type DiagnosticRecordType =
  | "window_error"
  | "unhandled_rejection"
  | "console_error"
  | "api_error";

export type DiagnosticRecord = {
  type: DiagnosticRecordType;
  message: string;
  timestamp: string;
  route?: string;
  details?: Record<string, unknown>;
};

const MAX_RECORDS = 50;
const buffer: DiagnosticRecord[] = [];
let initialized = false;

function pushRecord(record: DiagnosticRecord): void {
  buffer.push(record);
  if (buffer.length > MAX_RECORDS) {
    buffer.splice(0, buffer.length - MAX_RECORDS);
  }
}

function currentRoute(): string | undefined {
  if (typeof window === "undefined") return undefined;
  return `${window.location.pathname}${window.location.search}`;
}

function sanitizeDetails(details: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(details)) {
    const lower = key.toLowerCase();
    if (
      lower.includes("authorization") ||
      lower.includes("cookie") ||
      lower.includes("token") ||
      lower.includes("password") ||
      lower.includes("secret") ||
      lower.includes("bearer")
    ) {
      sanitized[key] = "[REDACTED]";
    } else if (typeof value === "string") {
      sanitized[key] = value.replace(/Bearer\s+\S+/gi, "Bearer [REDACTED]");
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

export function recordApiError(path: string, status: number, message: string, body?: unknown): void {
  pushRecord({
    type: "api_error",
    message,
    timestamp: new Date().toISOString(),
    route: currentRoute(),
    details: sanitizeDetails({
      path,
      status,
      body: typeof body === "object" ? body : undefined,
    }),
  });
}

export function getDiagnosticsPayload(): Record<string, unknown> {
  return {
    records: [...buffer],
    capturedAt: new Date().toISOString(),
    route: currentRoute(),
    queryParams:
      typeof window !== "undefined"
        ? Object.fromEntries(new URLSearchParams(window.location.search))
        : {},
    userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
    viewport:
      typeof window !== "undefined"
        ? { width: window.innerWidth, height: window.innerHeight }
        : undefined,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    appVersion: import.meta.env.VITE_APP_VERSION ?? "0.0.0",
  };
}

export function initDiagnosticsBuffer(): void {
  if (initialized || typeof window === "undefined") return;
  initialized = true;

  window.addEventListener("error", (event) => {
    pushRecord({
      type: "window_error",
      message: event.message,
      timestamp: new Date().toISOString(),
      route: currentRoute(),
      details: sanitizeDetails({
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      }),
    });
  });

  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason;
    pushRecord({
      type: "unhandled_rejection",
      message: reason instanceof Error ? reason.message : String(reason),
      timestamp: new Date().toISOString(),
      route: currentRoute(),
      details: sanitizeDetails({
        stack: reason instanceof Error ? reason.stack : undefined,
      }),
    });
  });

  const originalConsoleError = console.error.bind(console);
  console.error = (...args: unknown[]) => {
    pushRecord({
      type: "console_error",
      message: args.map((a) => (typeof a === "string" ? a : JSON.stringify(a))).join(" "),
      timestamp: new Date().toISOString(),
      route: currentRoute(),
    });
    originalConsoleError(...args);
  };
}

/** Test helper */
export function _resetDiagnosticsBufferForTests(): void {
  buffer.length = 0;
  initialized = false;
}
