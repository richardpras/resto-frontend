/** Matches Settings bridge wizard and API `hardware.bridge_online_grace_seconds`. */
export const BRIDGE_ONLINE_GRACE_MS = 120_000;

export function isHardwareBridgeDeviceOnline(lastSeenAt: string | null | undefined): boolean {
  if (!lastSeenAt) return false;
  const seen = new Date(lastSeenAt).getTime();
  if (Number.isNaN(seen)) return false;
  return Date.now() - seen < BRIDGE_ONLINE_GRACE_MS;
}
