import { describe, expect, it, vi, afterEach } from "vitest";
import {
  probeApiReachability,
  resolveApiHealthUrl,
  resolveLaravelUpUrl,
} from "@/mobile/offline/apiReachability";
import { createDeviceUuid } from "@/mobile/offline/createDeviceUuid";
import {
  capabilityForPath,
  isPathAllowedOffline,
  isOfflineCapabilityAllowed,
} from "@/mobile/offline/offlineCapability";

describe("apiReachability", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("probes Laravel /up derived from api base", () => {
    expect(resolveApiHealthUrl("http://192.168.1.10:8000/api/v1")).toBe("http://192.168.1.10:8000/up");
    expect(resolveApiHealthUrl("https://api.example.com/api/v1/")).toBe("https://api.example.com/up");
    expect(resolveLaravelUpUrl("http://192.168.1.10:8000/api/v1")).toBe("http://192.168.1.10:8000/up");
  });

  it("treats any HTTP response as reachable", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, status: 401 })),
    );
    await expect(probeApiReachability({ timeoutMs: 1000 })).resolves.toEqual({ ok: true, status: 401 });
  });

  it("treats network failure as not ok", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("Failed to fetch");
      }),
    );
    await expect(probeApiReachability({ timeoutMs: 1000 })).resolves.toMatchObject({ ok: false });
  });
});

describe("deviceKey", () => {
  it("creates a uuid without crypto.randomUUID", () => {
    vi.stubGlobal("crypto", {
      getRandomValues: (arr: Uint8Array) => {
        for (let i = 0; i < arr.length; i += 1) arr[i] = i;
        return arr;
      },
    });
    const id = createDeviceUuid();
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  });
});

describe("offlineCapability", () => {
  it("allows POS and blocks QR/reservations/daily close", () => {
    expect(isPathAllowedOffline("/pos")).toBe(true);
    expect(isPathAllowedOffline("/cashier")).toBe(true);
    expect(isPathAllowedOffline("/shift-close")).toBe(false);
    expect(isPathAllowedOffline("/qr-orders")).toBe(false);
    expect(isPathAllowedOffline("/reservations")).toBe(false);
    expect(isPathAllowedOffline("/accounting")).toBe(false);
    expect(capabilityForPath("/members")).toBe("membersCreate");
    expect(isOfflineCapabilityAllowed("gatewayPayment")).toBe(false);
  });
});
