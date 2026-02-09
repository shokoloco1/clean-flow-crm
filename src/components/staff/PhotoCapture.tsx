import { useRef, useState } from "react";
import { Camera, RefreshCw, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/hooks/useLanguage";

interface PhotoCaptureProps {
  area: string;
  existingPhoto?: string;
  onCapture: (file: File) => Promise<void>;
  disabled?: boolean;
}

export function PhotoCapture({ area, existingPhoto, onCapture, disabled }: PhotoCaptureProps) {
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
          "w-full aspect-[4/3] rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-all",
          hasPhoto 
            ? "border-success bg-success/5" 
            : "border-border hover:border-primary hover:bg-primary/5",
          (disabled || isUploading) && "opacity-50 cursor-not-allowed"
        )}
      >
        {isUploading ? (
          <>
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
            <span className="text-xs text-muted-foreground">Uploading...</span>
          </>
        ) : hasPhoto ? (
          <div className="relative w-full h-full">
            <img 
              src={preview!} 
              alt={area}
              className="w-full h-full object-cover rounded-lg"
            />
            <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center gap-1 opacity-0 hover:opacity-100 transition-opacity rounded-lg">
              <RefreshCw className="h-6 w-6 text-white" />
              <span className="text-xs text-white font-medium">{t("retake")}</span>
            </div>
            <div className="absolute top-2 right-2 h-6 w-6 rounded-full bg-success flex items-center justify-center">
              <Check className="h-4 w-4 text-white" />
            </div>
          </div>
        ) : (
          <>
            <Camera className="h-8 w-8 text-muted-foreground" />
            <span className="text-xs text-muted-foreground font-medium">{t("take_photo")}</span>
          </>
        )}
      </button>
      
      <p className="text-xs text-center text-muted-foreground mt-1 font-medium">
        {area}
      </p>
    </div>
  );
}
