import { useState } from "react";
import { Camera, XCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { QuickPhotoCapture } from "./QuickPhotoCapture";
import { useLanguage } from "@/hooks/useLanguage";

interface JobPhoto {
  id: string;
  photo_url: string;
  photo_type: "before" | "after";
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
  onPhotosUpdated,
}: BeforeAfterPhotosProps) {
  const { t } = useLanguage();
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  const beforePhotos = photos.filter((p) => p.photo_type === "before");
  const afterPhotos = photos.filter((p) => p.photo_type === "after");
  const isInProgress = jobStatus === "in_progress";
  const isCompleted = jobStatus === "completed";

  return (
    <>
      <Card className="border-border shadow-sm">
        <CardContent className="space-y-4 p-4">
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
                  <p className="mb-2 text-xs font-medium text-muted-foreground">
                    {t("before")} ({beforePhotos.length})
                  </p>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {beforePhotos.map((photo) => (
                      <div
                        key={photo.id}
                        className="h-16 w-16 flex-shrink-0 cursor-pointer overflow-hidden rounded-lg border-2 border-muted bg-muted"
                        onClick={() => setSelectedPhoto(photo.photo_url)}
                      >
                        <img
                          src={photo.photo_url}
                          alt={t("before")}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* After Photos */}
              {afterPhotos.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-medium text-muted-foreground">
                    {t("after")} ({afterPhotos.length})
                  </p>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {afterPhotos.map((photo) => (
                      <div
                        key={photo.id}
                        className="h-16 w-16 flex-shrink-0 cursor-pointer overflow-hidden rounded-lg border-2 border-success/50 bg-muted"
                        onClick={() => setSelectedPhoto(photo.photo_url)}
                      >
                        <img
                          src={photo.photo_url}
                          alt={t("after")}
                          className="h-full w-full object-cover"
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
            <p className="py-4 text-center text-sm text-muted-foreground">{t("no_photos_yet")}</p>
          )}

          {/* Completed Summary */}
          {isCompleted && photos.length > 0 && (
            <div className="rounded-lg bg-success/10 py-2 text-center">
              <p className="text-sm font-medium text-success">
                ✓ {beforePhotos.length} {t("before").toLowerCase()}, {afterPhotos.length}{" "}
                {t("after").toLowerCase()} photos
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{t("you_can_still_add")}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Photo Lightbox */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 p-4"
          onClick={() => setSelectedPhoto(null)}
        >
          <button
            className="absolute right-4 top-4 text-foreground"
            onClick={() => setSelectedPhoto(null)}
          >
            <XCircle className="h-8 w-8" />
          </button>
          <img
            src={selectedPhoto}
            alt="Full size"
            className="max-h-full max-w-full object-contain"
          />
        </div>
      )}
    </>
  );
}
