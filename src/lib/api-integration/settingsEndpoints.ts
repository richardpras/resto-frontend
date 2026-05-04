import type { SettingsPayload } from "@/stores/settingsStore";
import { apiRequest as request } from "./client";

type ItemEnvelope<T> = { data: T };

export async function getSettings(): Promise<SettingsPayload> {
  const res = await request<ItemEnvelope<SettingsPayload>>("/settings");
  return res.data;
}

export async function updateSettings(payload: SettingsPayload): Promise<SettingsPayload> {
  const res = await request<ItemEnvelope<SettingsPayload> & { message: string }>("/settings", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  return res.data;
}
