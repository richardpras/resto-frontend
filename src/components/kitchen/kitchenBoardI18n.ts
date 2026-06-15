import type { TFunction } from "i18next";
import { KITCHEN_BOARD_COLUMNS, type KitchenBoardColumn } from "@/domain/kitchenWorkflow";

export function translateKitchenBoardColumns(t: TFunction): KitchenBoardColumn[] {
  return KITCHEN_BOARD_COLUMNS.map((col) => ({
    ...col,
    title: t(`kitchen.columns.${col.id}.title`),
    actionLabel: t(`kitchen.columns.${col.id}.action`),
  }));
}

export function translateKitchenServiceMode(t: TFunction, mode: string | null | undefined): string {
  if (!mode) return "—";
  const key = `kitchen.serviceMode.${mode}`;
  const translated = t(key);
  if (translated !== key) return translated;
  return mode
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}
