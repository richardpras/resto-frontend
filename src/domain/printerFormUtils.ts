import type { Printer } from "@/domain/settingsDomainTypes";

const MAC_ADDRESS_PATTERN = /([0-9A-Fa-f]{2}(:[0-9A-Fa-f]{2}){5})/;

function extractMacAddress(value: string): string | undefined {
  const match = value.match(MAC_ADDRESS_PATTERN);
  return match ? match[1].toUpperCase() : undefined;
}

/** Map API/storage fields back into connection-specific form fields. */
export function normalizePrinterForForm(printer: Printer): Printer {
  const normalized: Printer = {
    ...printer,
    thermalPaperWidth: printer.thermalPaperWidth ?? "58mm",
  };

  if (printer.connection === "shared") {
    normalized.sharePath = printer.sharePath || printer.bluetoothDevice || "";
    normalized.sharePrinterName = printer.sharePrinterName || printer.ip || "";
    return normalized;
  }

  if (printer.connection === "usb") {
    normalized.devicePath = printer.devicePath || printer.bluetoothDevice || "";
    return normalized;
  }

  if (printer.connection === "bluetooth") {
    const raw = printer.bluetoothDevice || printer.devicePath || "";
    normalized.bluetoothAddress =
      printer.bluetoothAddress || extractMacAddress(raw) || "";
    normalized.devicePath =
      printer.devicePath ||
      (normalized.bluetoothAddress && raw.replace(normalized.bluetoothAddress, "").trim()) ||
      raw;
    return normalized;
  }

  if (printer.connection === "lan") {
    const host = printer.ip?.trim() ?? "";
    if (host.includes(":") && !printer.port) {
      const [ipPart, portPart] = host.split(":");
      if (ipPart && portPart && /^\d+$/.test(portPart)) {
        normalized.ip = ipPart;
        normalized.port = Number(portPart);
      }
    }
    if (normalized.port === undefined) {
      normalized.port = printer.port ?? 9100;
    }
  }

  return normalized;
}

export function buildPrinterPayload(form: Printer): Printer {
  const payload: Printer = {
    id: form.id,
    name: form.name,
    printerType: form.printerType,
    connection: form.connection,
    thermalPaperWidth: form.thermalPaperWidth ?? "58mm",
    outletId: form.outletId,
    printerProfileId: form.printerProfileId,
  };
  if (form.connection === "lan") {
    payload.ip = form.ip?.trim();
    payload.port = form.port ?? 9100;
  } else if (form.connection === "usb") {
    payload.devicePath = form.devicePath?.trim();
    payload.bluetoothDevice = form.devicePath?.trim();
  } else if (form.connection === "bluetooth") {
    payload.bluetoothAddress = form.bluetoothAddress?.trim();
    payload.devicePath = form.devicePath?.trim();
    payload.bluetoothDevice = form.bluetoothAddress?.trim() || form.devicePath?.trim();
  } else if (form.connection === "shared") {
    payload.sharePath = form.sharePath?.trim();
    payload.sharePrinterName = form.sharePrinterName?.trim();
    payload.bluetoothDevice = form.sharePath?.trim();
    payload.ip = form.sharePrinterName?.trim();
  }
  return payload;
}
