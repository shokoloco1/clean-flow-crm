import { useRef, useState } from "react";
import { Camera, CheckCircle2, Loader2, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { logger } from "@/lib/logger";

interface QuickPhotoCaptureProps {
  jobId: string;
  photoType: "before" | "after";
  existingCount: number;
  onPhotoUploaded: () => void;
  disabled?: boolean;
}

export function QuickPhotoCapture({ 
  jobId, 
  photoType, 
  existingCount, 
  onPhotoUploaded,
  disabled = false
}: QuickPhotoCaptureProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleCapture = () => {
    inputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${jobId}/${photoType}-${Date.now()}.${fileExt}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('job-evidence')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('job-evidence')
        .getPublicUrl(uploadData.path);

      const { error: dbError } = await supabase
        .from('job_photos')
        .insert({
          job_id: jobId,
          photo_url: urlData.publicUrl,
          photo_type: photoType
        });

      if (dbError) throw dbError;

      toast.success(`📸 ${photoType === 'before' ? 'Before' : 'After'} photo saved!`);
      onPhotoUploaded();
    } catch (error) {
      logger.error('Photo upload error:', error);
      toast.error('Failed to upload photo');
    } finally {
      setIsUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const isBefore = photoType === "before";
  const hasPhotos = existingCount > 0;

  return (
    <div className="flex-1">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
        disabled={disabled || isUploading}
      />
      
      <Button
        onClick={handleCapture}
        disabled={disabled || isUploading}
        className={`
          w-full h-20 flex flex-col items-center justify-center gap-1 text-lg font-semibold
          ${hasPhotos 
            ? "bg-success/20 border-2 border-success text-success hover:bg-success/30" 
            : isBefore 
              ? "bg-primary hover:bg-primary/90" 
              : "bg-secondary hover:bg-secondary/80"
          }
        `}
        variant={hasPhotos ? "outline" : "default"}
      >
        {isUploading ? (
          <Loader2 className="h-6 w-6 animate-spin" />
        ) : hasPhotos ? (
          <>
            <div className="flex items-center gap-1">
              <CheckCircle2 className="h-5 w-5" />
              <span>{existingCount}</span>
            </div>
            <span className="text-xs font-normal">+ Add more</span>
          </>
        ) : (
          <>
            <Camera className="h-6 w-6" />
            <span>{isBefore ? "📷 BEFORE" : "📷 AFTER"}</span>
          </>
        )}
      </Button>
    </div>
  );
}
