import { useState } from "react";
import { Volume2, X } from "lucide-react";
import { soundAlertService } from "@/lib/sound/soundAlertService";
import { useSoundAlertPreferences } from "@/hooks/useSoundAlertPreferences";
import { useAuthStore } from "@/stores/authStore";
import { Button } from "@/components/ui/button";

export function SoundAlertPrompt() {
  const user = useAuthStore((s) => s.user);
  const prefs = useSoundAlertPreferences();
  const [enabling, setEnabling] = useState(false);
  const [hidden, setHidden] = useState(false);

  if (!user || hidden || !soundAlertService.shouldShowPrompt()) {
    return null;
  }

  const onEnable = async () => {
    setEnabling(true);
    const ok = await soundAlertService.unlock();
    setEnabling(false);
    if (ok) {
      setHidden(true);
    }
  };

  const onDismiss = () => {
    soundAlertService.dismissPrompt();
    setHidden(true);
  };

  return (
    <div
      className="shrink-0 flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 border-b border-primary/20 bg-primary/5 text-sm"
      data-testid="sound-alert-prompt"
      role="region"
      aria-label="Enable sound alerts"
    >
      <div className="flex items-center gap-2 min-w-0 text-foreground">
        <Volume2 className="h-4 w-4 shrink-0 text-primary" aria-hidden />
        <p className="text-sm">
          Enable sound alerts to hear new orders and kitchen tickets.
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          size="sm"
          data-testid="sound-alert-enable"
          disabled={enabling || !prefs.enabled}
          onClick={() => void onEnable()}
        >
          {enabling ? "Enabling…" : "Enable Sound"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          data-testid="sound-alert-dismiss"
          onClick={onDismiss}
        >
          Not now
        </Button>
        <button
          type="button"
          className="p-1 rounded-md hover:bg-muted text-muted-foreground"
          aria-label="Close sound alert prompt"
          onClick={onDismiss}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
