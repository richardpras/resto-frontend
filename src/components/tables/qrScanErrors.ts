export type QrScanErrorCode = "qr_not_found" | "qr_expired" | "table_unavailable" | "outlet_unavailable";

export function qrScanErrorTitle(code: QrScanErrorCode): string {
  switch (code) {
    case "qr_not_found":
      return "QR not found";
    case "qr_expired":
      return "QR expired";
    case "table_unavailable":
      return "Table unavailable";
    case "outlet_unavailable":
      return "Outlet unavailable";
    default:
      return "QR unavailable";
  }
}

export function qrScanErrorMessage(code: QrScanErrorCode): string {
  switch (code) {
    case "qr_not_found":
      return "This QR code is not recognized. Ask staff for a new table QR.";
    case "qr_expired":
      return "This QR code has expired or was disabled. Please ask staff to print a new one.";
    case "table_unavailable":
      return "This table is not available for ordering right now.";
    case "outlet_unavailable":
      return "This location is not accepting QR orders at the moment.";
    default:
      return "Unable to open this QR link.";
  }
}
