import { toast } from "sonner";
import type { SoundAlertType } from "@/lib/sound/soundAlertService";

const VISUAL_MESSAGES: Record<SoundAlertType, string> = {
  new_order: "New order received",
  kitchen_ticket: "New kitchen ticket",
  critical_alert: "Critical notification",
};

export function showSoundAlertVisualFallback(type: SoundAlertType, detail?: string): void {
  const message = detail ?? VISUAL_MESSAGES[type];
  toast.message(message, {
    duration: 4000,
    id: `sound-alert-${type}`,
  });
}
