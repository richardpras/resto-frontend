function normalizePublicLookupCode(code: string): string | null {
  const normalized = code.trim().toUpperCase();
  if (!normalized) return null;
  if (/^QRO-[A-Z0-9]{6,16}$/.test(normalized)) return normalized;
  if (/^DEMO-[A-Z0-9]+-QRO-[A-Z0-9-]+$/.test(normalized)) return normalized;
  return null;
}

export function parseQrOrderCode(input: string): string | null {
  const trimmed = input.trim().replace(/\s+/g, "");
  if (!trimmed) return null;

  const urlMatch = trimmed.match(/\/qr\/order\/([^/?#]+)/i);
  if (urlMatch?.[1]) {
    const fromUrl = normalizePublicLookupCode(decodeURIComponent(urlMatch[1]));
    if (fromUrl) return fromUrl;
  }

  const direct = normalizePublicLookupCode(trimmed);
  if (direct) return direct;

  const codeMatch = trimmed.match(/(QRO-?[A-Z0-9]{6,20})/i);
  if (codeMatch?.[1]) {
    const raw = codeMatch[1].toUpperCase();
    return raw.startsWith("QRO-") ? raw : `QRO-${raw.slice(3)}`;
  }

  if (/^QRO[A-Z0-9]{6,20}$/i.test(trimmed)) {
    return `QRO-${trimmed.slice(3).toUpperCase()}`;
  }

  return null;
}
