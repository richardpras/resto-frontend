import { useCallback, useRef, useState } from "react";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { MenuItemImage } from "@/components/menu/MenuItemImage";
import { useOpsTranslation } from "@/i18n/useOpsTranslation";

type MenuImageUploadFieldProps = {
  imageUrl?: string | null;
  imageVersion?: number | null;
  emoji?: string | null;
  name: string;
  hasImage?: boolean;
  disabled?: boolean;
  onUpload: (file: File) => Promise<void>;
  onRemove: () => Promise<void>;
};

export function MenuImageUploadField({
  imageUrl,
  imageVersion,
  emoji,
  name,
  hasImage = false,
  disabled = false,
  onUpload,
  onRemove,
}: MenuImageUploadFieldProps) {
  const { t } = useOpsTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);

  const displayUrl = previewUrl ?? imageUrl ?? null;
  const busy = uploading || removing;

  const handleFile = useCallback(
    async (file: File | undefined) => {
      if (!file || disabled || busy) return;
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);
      setUploading(true);
      try {
        await onUpload(file);
      } finally {
        setUploading(false);
        URL.revokeObjectURL(objectUrl);
        setPreviewUrl(null);
      }
    },
    [busy, disabled, onUpload],
  );

  const handleRemove = useCallback(async () => {
    if (disabled || busy) return;
    if (!window.confirm(t("menu.removeImageConfirm"))) return;
    setRemoving(true);
    try {
      await onRemove();
    } finally {
      setRemoving(false);
    }
  }, [busy, disabled, onRemove, t]);

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-foreground">{t("menu.itemPhoto")}</label>
      <div
        className={`relative rounded-xl border border-dashed border-border/70 bg-muted/20 p-4 ${disabled ? "opacity-60" : ""}`}
        onDragOver={(event) => {
          event.preventDefault();
        }}
        onDrop={(event) => {
          event.preventDefault();
          void handleFile(event.dataTransfer.files?.[0]);
        }}
      >
        <div className="flex items-center gap-4">
          <MenuItemImage
            imageUrl={displayUrl}
            imageVersion={imageVersion}
            emoji={emoji}
            name={name}
            size="thumb"
          />
          <div className="flex-1 space-y-2">
            <p className="text-xs text-muted-foreground">{t("menu.imageHint")}</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={disabled || busy}
                onClick={() => inputRef.current?.click()}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted/60 disabled:opacity-50"
              >
                {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImagePlus className="h-3.5 w-3.5" />}
                {uploading ? t("menu.imageUploading") : t("menu.uploadImage")}
              </button>
              {hasImage ? (
                <button
                  type="button"
                  disabled={disabled || busy}
                  onClick={() => void handleRemove()}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-destructive/30 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/5 disabled:opacity-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  {t("menu.removeImage")}
                </button>
              ) : null}
            </div>
          </div>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(event) => void handleFile(event.target.files?.[0])}
        />
      </div>
    </div>
  );
}
