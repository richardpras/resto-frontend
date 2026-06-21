import type { Outlet } from "./settingsDomainTypes";

type NullableString = string | null | undefined;

export type OutletApiDto = {
  id: number | string;
  code?: NullableString;
  name?: NullableString;
  address?: NullableString;
  phone?: NullableString;
  manager?: NullableString;
  status?: "active" | "inactive" | string | null;
  logo?: NullableString;
  logoUrl?: NullableString;
  hasLogo?: boolean | null;
  logoVersion?: number | null;
  invoicePrefix?: NullableString;
  orderPrefix?: NullableString;
  invoice_prefix?: NullableString;
  order_prefix?: NullableString;
};

function toStringOrEmpty(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function toOptionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() !== "" ? value : undefined;
}

function toOutletStatus(value: unknown): Outlet["status"] {
  return value === "inactive" ? "inactive" : "active";
}

export function mapOutletDtoToViewModel(dto: OutletApiDto): Outlet {
  return {
    id: typeof dto.id === "string" ? Number(dto.id) : dto.id,
    code: toStringOrEmpty(dto.code),
    name: toStringOrEmpty(dto.name),
    address: toStringOrEmpty(dto.address),
    phone: toStringOrEmpty(dto.phone),
    manager: toStringOrEmpty(dto.manager),
    status: toOutletStatus(dto.status),
    logo: toOptionalString(dto.logo),
    logoUrl: toOptionalString(dto.logoUrl),
    hasLogo: dto.hasLogo === true,
    logoVersion: typeof dto.logoVersion === "number" ? dto.logoVersion : undefined,
    invoicePrefix: toOptionalString(dto.invoicePrefix ?? dto.invoice_prefix),
    orderPrefix: toOptionalString(dto.orderPrefix ?? dto.order_prefix),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getOutletDtoArray(payload: unknown): OutletApiDto[] {
  if (Array.isArray(payload)) return payload as OutletApiDto[];
  if (!isRecord(payload)) return [];

  const rootData = payload.data;
  if (Array.isArray(rootData)) return rootData as OutletApiDto[];
  if (isRecord(rootData) && Array.isArray(rootData.data)) return rootData.data as OutletApiDto[];
  return [];
}

export function parseOutletListPayload(payload: unknown): Outlet[] {
  return getOutletDtoArray(payload).map(mapOutletDtoToViewModel);
}

export type AssignedOutletRef = {
  id: number;
  name: string;
  code?: string | null;
};

/** Minimal outlet rows from auth `/me` — enough for selectors (printer settings, pairing, etc.). */
export function mapAssignedOutletsToSettingsOutlets(rows: AssignedOutletRef[] | undefined): Outlet[] {
  if (!rows?.length) return [];
  return rows.map((o) => ({
    id: o.id,
    code: o.code ?? "",
    name: o.name,
    address: "",
    phone: "",
    manager: "",
    status: "active" as const,
  }));
}
