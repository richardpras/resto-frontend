import { apiRequest } from "./client";

export type PrinterRouteStationApi = {
  id: number;
  code: string;
  name: string;
};

export type PrinterRouteApi = {
  id: number;
  outletId: number;
  printerProfileId: number;
  printType: "kitchen" | "receipt" | string;
  routeScope: string;
  itemId?: number | null;
  productionStationId?: number | null;
  stationCode?: string | null;
  productionStation?: PrinterRouteStationApi | null;
  station?: string | null;
  category?: string | null;
  priority: number;
  isActive: boolean;
  meta?: Record<string, unknown> | null;
};

export type AssignPrinterRoutePayload = {
  outletId: number;
  printerProfileId: number;
  printType: "kitchen" | "receipt";
  routeScope?: string;
  productionStationId?: number;
  station?: string;
  stationCode?: string;
  category?: string;
  sourceCategory?: string;
  priority?: number;
  isActive?: boolean;
};

export async function listPrinterRoutes(outletId: number): Promise<PrinterRouteApi[]> {
  const response = await apiRequest<{ data: PrinterRouteApi[] }>(`/print/routes?outletId=${outletId}`);
  return response.data;
}

export async function assignPrinterRoute(payload: AssignPrinterRoutePayload): Promise<PrinterRouteApi> {
  const response = await apiRequest<{ data: PrinterRouteApi }>("/print/routes", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return response.data;
}

export async function deletePrinterRoute(routeId: number): Promise<void> {
  await apiRequest(`/print/routes/${routeId}`, { method: "DELETE" });
}
