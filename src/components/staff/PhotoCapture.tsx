import { useRef, useState } from "react";
import { Camera, RefreshCw, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/hooks/useLanguage";
import { Button } from "@/components/ui/button";

interface PhotoCaptureProps {
  area: string;
  existingPhoto?: string;
  onCapture: (file: File) => Promise<void>;
  disabled?: boolean;
  compact?: boolean;
  retakeMode?: boolean;
}

export function PhotoCapture({
  area,
  existingPhoto,
  onCapture,
  disabled,
  compact = false,
  retakeMode = false,
}: PhotoCaptureProps) {
  const { t } = useLanguage();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(existingPhoto || null);
  const [isUploading, setIsUploading] = useState(false);

  const handleCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show preview immediately
    const reader = new FileReader();
    reader.onload = (ev) => {
      setPreview(ev.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Upload
    setIsUploading(true);
    try {
      await onCapture(file);
    } finally {
      setIsUploading(false);
    }

    // Reset input so same file can be selected again
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const hasPhoto = !!preview;

  // Retake mode - just a small button
  if (retakeMode) {
    return (
      <>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleCapture}
          disabled={disabled || isUploading}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={disabled || isUploading}
          className="w-full gap-2"
        >
          {isUploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          {t("retake")}
        </Button>
      </>
    );
  }

  // Compact mode - square aspect ratio for grid layouts
  if (compact) {
    return (
      <>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleCapture}
          disabled={disabled || isUploading}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={disabled || isUploading}
          className={cn(
            "flex aspect-square w-full flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed transition-all",
            hasPhoto
              ? "border-success bg-success/5"
              : "border-border hover:border-primary hover:bg-primary/5",
            (disabled || isUploading) && "cursor-not-allowed opacity-50",
          )}
        >
          {isUploading ? (
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          ) : hasPhoto ? (
            <div className="relative h-full w-full">
              <img src={preview!} alt={area} className="h-full w-full rounded-md object-cover" />
              <div className="absolute inset-0 flex flex-col items-center justify-center rounded-md bg-black/40 opacity-0 transition-opacity hover:opacity-100">
                <RefreshCw className="h-5 w-5 text-white" />
              </div>
            </div>
          ) : (
            <>
              <Camera className="h-6 w-6 text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground">{t("take_photo")}</span>
            </>
          )}
        </button>
      </>
    );
  }

  // Default mode
  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleCapture}
        disabled={disabled || isUploading}
      />

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={disabled || isUploading}
        className={cn(
          "flex aspect-[4/3] w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed transition-all",
          hasPhoto
            ? "border-success bg-success/5"
            : "border-border hover:border-primary hover:bg-primary/5",
          (disabled || isUploading) && "cursor-not-allowed opacity-50",
        )}
      >
        {isUploading ? (
          <>
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="text-xs text-muted-foreground">Uploading...</span>
          </>
        ) : hasPhoto ? (
          <div className="relative h-full w-full">
            <img src={preview!} alt={area} className="h-full w-full rounded-lg object-cover" />
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 rounded-lg bg-black/40 opacity-0 transition-opacity hover:opacity-100">
              <RefreshCw className="h-6 w-6 text-white" />
              <span className="text-xs font-medium text-white">{t("retake")}</span>
            </div>
            <div className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-success">
              <Check className="h-4 w-4 text-white" />
            </div>
          </div>
        ) : (
          <>
            <Camera className="h-8 w-8 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">{t("take_photo")}</span>
          </>
        )}
      </button>

      <p className="mt-1 text-center text-xs font-medium text-muted-foreground">{area}</p>
    </div>
  );
}
