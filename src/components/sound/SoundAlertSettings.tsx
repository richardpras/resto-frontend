import { useState } from "react";
import { Volume2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { soundAlertService } from "@/lib/sound/soundAlertService";
import { useSoundAlertPreferences } from "@/hooks/useSoundAlertPreferences";
import { toast } from "sonner";

export function SoundAlertSettings() {
  const prefs = useSoundAlertPreferences();
  const [testing, setTesting] = useState(false);

  const onTestSound = async () => {
    setTesting(true);
    const ok = await soundAlertService.play("new_order", { visualFallback: true });
    setTesting(false);
    if (!ok && !soundAlertService.isUnlocked()) {
      toast.message("Enable sound alerts first using the banner or Enable button below.");
    }
  };

  const onEnableUnlock = async () => {
    const ok = await soundAlertService.unlock();
    if (ok) toast.success("Sound alerts enabled");
    else toast.error("Could not enable sound. Try again after interacting with the page.");
  };

  return (
    <Card data-testid="sound-alert-settings">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Volume2 className="h-5 w-5" /> Sound Alerts
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground">
          Hear new customer orders, kitchen tickets, and critical notifications. Browser autoplay rules require a one-time enable gesture.
        </p>

        <div className="flex items-center justify-between py-2 border-b">
          <div className="space-y-1">
            <Label className="text-sm font-medium">Enable sound alerts</Label>
            <p className="text-xs text-muted-foreground">Master switch for audible alerts.</p>
          </div>
          <Switch
            checked={prefs.enabled}
            onCheckedChange={(v) => soundAlertService.setEnabled(v)}
            data-testid="sound-alert-enabled-switch"
          />
        </div>

        <div className="flex items-center justify-between py-2 border-b">
          <div className="space-y-1">
            <Label className="text-sm font-medium">Browser unlock</Label>
            <p className="text-xs text-muted-foreground">
              {prefs.unlocked ? "Unlocked — audio may play for events." : "Required before sounds can play."}
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            variant={prefs.unlocked ? "secondary" : "default"}
            disabled={!prefs.enabled || prefs.unlocked}
            data-testid="sound-alert-unlock-button"
            onClick={() => void onEnableUnlock()}
          >
            {prefs.unlocked ? "Enabled" : "Enable Sound"}
          </Button>
        </div>

        <div className="flex items-center justify-between py-2 border-b">
          <div className="space-y-1">
            <Label className="text-sm font-medium">Mute</Label>
            <p className="text-xs text-muted-foreground">Silence alerts without disabling detection.</p>
          </div>
          <Switch
            checked={prefs.muted}
            onCheckedChange={(v) => soundAlertService.setMuted(v)}
            data-testid="sound-alert-mute-switch"
          />
        </div>

        <div className="space-y-3 py-2 border-b">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Volume</Label>
            <span className="text-xs text-muted-foreground tabular-nums">{Math.round(prefs.volume * 100)}%</span>
          </div>
          <Slider
            value={[Math.round(prefs.volume * 100)]}
            min={0}
            max={100}
            step={5}
            data-testid="sound-alert-volume-slider"
            onValueChange={(values) => soundAlertService.setVolume((values[0] ?? 85) / 100)}
          />
        </div>

        <div className="space-y-3 py-2 border-b">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-sm font-medium">Quiet hours</Label>
              <p className="text-xs text-muted-foreground">Optional — no sounds during this window.</p>
            </div>
            <Switch
              checked={prefs.quietHoursEnabled}
              onCheckedChange={(v) => soundAlertService.setQuietHours(v)}
              data-testid="sound-alert-quiet-hours-switch"
            />
          </div>
          {prefs.quietHoursEnabled ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Start</Label>
                <Input
                  type="time"
                  value={prefs.quietHoursStart}
                  onChange={(e) =>
                    soundAlertService.setQuietHours(true, e.target.value, prefs.quietHoursEnd)
                  }
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">End</Label>
                <Input
                  type="time"
                  value={prefs.quietHoursEnd}
                  onChange={(e) =>
                    soundAlertService.setQuietHours(true, prefs.quietHoursStart, e.target.value)
                  }
                />
              </div>
            </div>
          ) : null}
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          data-testid="sound-alert-test-button"
          disabled={testing}
          onClick={() => void onTestSound()}
        >
          {testing ? "Playing…" : "Test sound"}
        </Button>
      </CardContent>
    </Card>
  );
}
