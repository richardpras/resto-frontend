import { useEffect, useState } from "react";
import { soundAlertService } from "@/lib/sound/soundAlertService";
import type { SoundAlertPreferences } from "@/lib/sound/soundAlertPreferences";

export function useSoundAlertPreferences(): SoundAlertPreferences {
  const [prefs, setPrefs] = useState(() => soundAlertService.getPreferences());

  useEffect(() => soundAlertService.subscribe(setPrefs), []);

  return prefs;
}
