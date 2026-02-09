import { useState } from "react";
import { Camera, XCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { QuickPhotoCapture } from "./QuickPhotoCapture";
import { useLanguage } from "@/hooks/useLanguage";

interface JobPhoto {
  id: string;
  photo_url: string;
  photo_type: 'before' | 'after';
  created_at: string;
}

interface BeforeAfterPhotosProps {
  jobId: string;
  photos: JobPhoto[];
  jobStatus: string;
  onPhotosUpdated: () => void;
}

export function BeforeAfterPhotos({ 
  jobId, 
  photos, 
  jobStatus,
  onPhotosUpdated 
}: BeforeAfterPhotosProps) {
  const { t } = useLanguage();
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  
  const beforePhotos = photos.filter(p => p.photo_type === 'before');
  const afterPhotos = photos.filter(p => p.photo_type === 'after');
  const isInProgress = jobStatus === "in_progress";
  const isCompleted = jobStatus === "completed";

  return (
    <>
      <Card className="border-border shadow-sm">
        <CardContent className="p-4 space-y-4">
          {/* Header */}
          <div className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-primary" />
            <span className="font-semibold text-foreground">{t("before_after_photos")}</span>
          </div>

          {/* Quick Capture Buttons - Show when in progress or completed */}
          {(isInProgress || isCompleted) && (
            <div className="flex gap-3">
              <QuickPhotoCapture
                jobId={jobId}
                photoType="before"
                existingCount={beforePhotos.length}
                onPhotoUploaded={onPhotosUpdated}
              />
              <QuickPhotoCapture
                jobId={jobId}
                photoType="after"
                existingCount={afterPhotos.length}
                onPhotoUploaded={onPhotosUpdated}
              />
            </div>
          )}

          {/* Photo Thumbnails */}
          {photos.length > 0 && (
            <div className="space-y-3">
              {/* Before Photos */}
              {beforePhotos.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">
                    {t("before")} ({beforePhotos.length})
                  </p>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {beforePhotos.map((photo) => (
                      <div 
                        key={photo.id}
                        className="w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-muted cursor-pointer border-2 border-muted"
                        onClick={() => setSelectedPhoto(photo.photo_url)}
                      >
                        <img 
                          src={photo.photo_url} 
                          alt={t("before")}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* After Photos */}
              {afterPhotos.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">
                    {t("after")} ({afterPhotos.length})
                  </p>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {afterPhotos.map((photo) => (
                      <div 
                        key={photo.id}
                        className="w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-muted cursor-pointer border-2 border-success/50"
                        onClick={() => setSelectedPhoto(photo.photo_url)}
                      >
                        <img 
                          src={photo.photo_url} 
                          alt={t("after")}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Empty State - only show if pending (not started yet) */}
          {photos.length === 0 && !isInProgress && !isCompleted && (
            <p className="text-sm text-muted-foreground text-center py-4">
              {t("no_photos_yet")}
            </p>
          )}

          {/* Completed Summary */}
          {isCompleted && photos.length > 0 && (
            <div className="text-center py-2 bg-success/10 rounded-lg">
              <p className="text-sm font-medium text-success">
                ✓ {beforePhotos.length} {t("before").toLowerCase()}, {afterPhotos.length} {t("after").toLowerCase()} photos
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {t("you_can_still_add")}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Photo Lightbox */}
      {selectedPhoto && (
        <div 
          className="fixed inset-0 bg-background/95 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedPhoto(null)}
        >
          <button
            className="absolute top-4 right-4 text-foreground"
            onClick={() => setSelectedPhoto(null)}
          >
            <XCircle className="h-8 w-8" />
          </button>
          <img 
            src={selectedPhoto} 
            alt="Full size" 
            className="max-w-full max-h-full object-contain"
          />
        </div>
      )}
    </>
  );
}
