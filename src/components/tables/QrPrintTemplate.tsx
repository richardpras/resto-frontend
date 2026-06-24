import { forwardRef } from "react";
import type { FloorTableApi } from "@/lib/api-integration/tableEndpoints";

type Props = {
  table: FloorTableApi;
  qrImageSrc: string;
  restaurantName?: string;
  outletName?: string;
  scanHint?: string;
};

export const QrPrintTemplate = forwardRef<HTMLDivElement, Props>(function QrPrintTemplate(
  {
    table,
    qrImageSrc,
    restaurantName = "Restaurant",
    outletName = "Outlet",
    scanHint = "Scan to order from your table",
  },
  ref,
) {
  return (
    <div
      ref={ref}
      data-testid="qr-print-label"
      className="qr-print-label mx-auto w-[80mm] border border-black rounded-lg p-4 text-center text-black bg-white"
    >
      <p className="text-sm font-bold">{restaurantName}</p>
      <p className="text-xs text-gray-600 mb-2">{outletName}</p>
      <p className="text-xl font-extrabold mb-3">{table.name}</p>
      <img src={qrImageSrc} alt={`QR for ${table.name}`} className="mx-auto block h-40 w-40 object-contain" />
      <p className="text-xs mt-3 font-medium">{scanHint}</p>
    </div>
  );
});
