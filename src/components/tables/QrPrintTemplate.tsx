import type { FloorTableApi } from "@/lib/api-integration/tableEndpoints";

type Props = {
  table: FloorTableApi;
  qrImageSrc: string;
  restaurantName?: string;
  outletName?: string;
};

export function QrPrintTemplate({ table, qrImageSrc, restaurantName = "Restaurant", outletName = "Outlet" }: Props) {
  return (
    <div className="qr-print-label mx-auto w-[80mm] border border-black rounded-lg p-4 text-center text-black bg-white">
      <p className="text-sm font-bold">{restaurantName}</p>
      <p className="text-xs text-gray-600 mb-2">{outletName}</p>
      <p className="text-xl font-extrabold mb-3">{table.name}</p>
      <img src={qrImageSrc} alt={`QR for ${table.name}`} className="mx-auto h-40 w-40 object-contain" />
      <p className="text-xs mt-3 font-medium">Scan to order from your table</p>
      <p className="text-[10px] mt-2 break-all text-gray-600">{table.qrUrl}</p>
    </div>
  );
}
