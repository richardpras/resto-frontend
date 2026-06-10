import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { submitBugReport, type BugReportSeverity } from "@/lib/api-integration/bugReportEndpoints";
import { getDiagnosticsPayload } from "@/lib/diagnostics/diagnosticsBuffer";
import { useOutletStore } from "@/stores/outletStore";
import { ApiHttpError } from "@/lib/api-integration/client";

type BugReportModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  screenshotPreview: string | null;
  screenshotBlob: Blob | null;
  currentRoute: string;
};

function detectBrowser(): string {
  const ua = navigator.userAgent;
  if (ua.includes("Edg/")) return "Edge";
  if (ua.includes("Chrome/")) return "Chrome";
  if (ua.includes("Firefox/")) return "Firefox";
  if (ua.includes("Safari/") && !ua.includes("Chrome")) return "Safari";
  return "Unknown";
}

export function BugReportModal({
  open,
  onOpenChange,
  screenshotPreview,
  screenshotBlob,
  currentRoute,
}: BugReportModalProps) {
  const activeOutletId = useOutletStore((s) => s.activeOutletId);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [severity, setSeverity] = useState<BugReportSeverity>("medium");
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setTitle("");
    setMessage("");
    setSeverity("medium");
  };

  const handleSubmit = async () => {
    if (!title.trim() || !message.trim()) {
      toast.error("Title and message are required");
      return;
    }

    setSubmitting(true);
    try {
      const diagnostics = getDiagnosticsPayload();
      await submitBugReport({
        outletId: typeof activeOutletId === "number" && activeOutletId > 0 ? activeOutletId : undefined,
        title: title.trim(),
        message: message.trim(),
        severity,
        currentRoute,
        browser: detectBrowser(),
        userAgent: navigator.userAgent,
        viewport: `${window.innerWidth}x${window.innerHeight}`,
        appVersion: import.meta.env.VITE_APP_VERSION ?? "0.0.0",
        diagnosticsJson: diagnostics,
        screenshot: screenshotBlob,
      });
      toast.success("Bug report submitted. Thank you!");
      reset();
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof ApiHttpError ? e.message : "Failed to submit bug report");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Report a Bug</DialogTitle>
          <DialogDescription>
            Describe what went wrong. A screenshot and diagnostic data are attached automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {screenshotPreview ? (
            <div className="rounded-lg border overflow-hidden bg-muted/30">
              <img
                src={screenshotPreview}
                alt="Page screenshot preview"
                className="w-full max-h-48 object-contain object-top"
              />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Screenshot capture unavailable for this page.</p>
          )}

          <div className="space-y-2">
            <Label htmlFor="bug-title">Title</Label>
            <Input
              id="bug-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Brief summary of the issue"
              maxLength={200}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bug-message">Description</Label>
            <Textarea
              id="bug-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="What were you doing? What did you expect?"
              rows={4}
              maxLength={5000}
            />
          </div>

          <div className="space-y-2">
            <Label>Severity (optional)</Label>
            <Select value={severity} onValueChange={(v) => setSeverity(v as BugReportSeverity)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={() => void handleSubmit()} disabled={submitting}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Submit Report
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
