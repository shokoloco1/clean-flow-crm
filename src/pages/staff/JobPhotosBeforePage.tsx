import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/hooks/useLanguage";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { JobTimer } from "@/components/staff/JobTimer";
import { PhotoCapture } from "@/components/staff/PhotoCapture";
import { ArrowLeft, ArrowRight, Loader2, Camera, AlertCircle } from "lucide-react";

// Default areas for photo capture
const DEFAULT_AREAS = ["Living Room", "Kitchen", "Bathroom", "Bedroom"];

const AREA_TRANSLATIONS: Record<string, Record<string, string>> = {
  en: {
    "Living Room": "Living Room",
    Kitchen: "Kitchen",
    Bathroom: "Bathroom",
    Bedroom: "Bedroom",
  },
  es: {
    "Living Room": "Sala",
    Kitchen: "Cocina",
    Bathroom: "Baño",
    Bedroom: "Dormitorio",
  },
};

interface JobData {
  id: string;
  start_time: string | null;
  status: string;
  properties: {
    estimated_hours: number | null;
  } | null;
}

interface PhotoRecord {
  area: string;
  url: string;
}

export default function JobPhotosBeforePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const { toast } = useToast();

  const [job, setJob] = useState<JobData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [photos, setPhotos] = useState<PhotoRecord[]>([]);
  const [uploadingArea, setUploadingArea] = useState<string | null>(null);

  const MIN_PHOTOS = 3;

  useEffect(() => {
    const fetchJob = async () => {
      if (!id) {
        setError("No job ID provided");
        setLoading(false);
        return;
      }

      try {
        // Fetch job details
        const { data: jobData, error: jobError } = await supabase
          .from("jobs")
          .select(
            `
            id,
            start_time,
            status,
            properties (
              estimated_hours
            )
          `,
          )
          .eq("id", id)
          .single();

        if (jobError) throw jobError;
        setJob(jobData as JobData);

        // Fetch existing before photos
        const { data: existingPhotos } = await supabase
          .from("job_photos")
          .select("photo_url, area")
          .eq("job_id", id)
          .eq("photo_type", "before");

        if (existingPhotos) {
          setPhotos(
            existingPhotos.map((p) => ({
              area: p.area || "General",
              url: p.photo_url,
            })),
          );
        }
      } catch (err) {
        console.error("Error fetching job:", err);
        setError("Could not load job details");
      } finally {
        setLoading(false);
      }
    };

    fetchJob();
  }, [id]);

  const handlePhotoCapture = async (area: string, file: File) => {
    if (!id) return;

    setUploadingArea(area);

    try {
      // Create unique file path
      const fileExt = file.name.split(".").pop() || "jpg";
      const fileName = `${id}/${Date.now()}-before-${area.toLowerCase().replace(/\s+/g, "-")}.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from("job-evidence")
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Get signed URL
      const { data: signedUrlData } = await supabase.storage
        .from("job-evidence")
        .createSignedUrl(fileName, 60 * 60 * 24 * 365); // 1 year

      const photoUrl = signedUrlData?.signedUrl || fileName;

      // Save to job_photos table
      const { error: insertError } = await supabase.from("job_photos").insert({
        job_id: id,
        photo_url: photoUrl,
        photo_type: "before",
        area: area,
      });

      if (insertError) throw insertError;

      // Update local state
      setPhotos((prev) => {
        // Remove existing photo for this area if any
        const filtered = prev.filter((p) => p.area !== area);
        return [...filtered, { area, url: photoUrl }];
      });

      toast({
        title: t("success"),
        description: `${area} ${t("photo_saved")}`,
      });
    } catch (err) {
      console.error("Error uploading photo:", err);
      toast({
        title: t("error"),
        description: t("failed_upload"),
        variant: "destructive",
      });
    } finally {
      setUploadingArea(null);
    }
  };

  const canContinue = photos.length >= MIN_PHOTOS;

  const handleContinue = () => {
    if (id) {
      navigate(`/staff/job/${id}/checklist`);
    }
  };

  const getAreaTranslation = (area: string) => {
    return AREA_TRANSLATIONS[language]?.[area] || area;
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">{t("loading")}</p>
        </div>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="mx-auto mb-4 h-12 w-12 text-destructive" />
            <p className="font-medium text-destructive">{error || "Job not found"}</p>
            <Button variant="outline" className="mt-4" onClick={() => navigate("/staff")}>
              {t("go_back")}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Redirect if job isn't in progress
  if (job.status !== "in_progress") {
    navigate(`/staff/job/${id}/start`, { replace: true });
    return null;
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b bg-background px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/staff")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-lg font-semibold">{t("photos_before_title")}</h1>
              <p className="text-xs text-muted-foreground">{t("capture_before_state")}</p>
            </div>
          </div>

          {/* Timer */}
          {job.start_time && (
            <JobTimer
              startedAt={new Date(job.start_time)}
              estimatedHours={job.properties?.estimated_hours || undefined}
              compact
            />
          )}
        </div>
      </div>

      <div className="space-y-4 p-4">
        {/* Progress Indicator */}
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Camera className="h-5 w-5 text-primary" />
                <span className="font-medium">
                  {photos.length} / {MIN_PHOTOS} {t("photos_progress")}
                </span>
              </div>
              {photos.length < MIN_PHOTOS && (
                <span className="text-xs text-muted-foreground">{t("minimum_photos")}</span>
              )}
              {photos.length >= MIN_PHOTOS && (
                <span className="text-xs font-medium text-success">
                  ✓ {t("minimum_photos").replace("required", "complete")}
                </span>
              )}
            </div>

            {/* Progress bar */}
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-success transition-all duration-300"
                style={{ width: `${Math.min((photos.length / MIN_PHOTOS) * 100, 100)}%` }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Photo Grid */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t("areas")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {DEFAULT_AREAS.map((area) => (
                <PhotoCapture
                  key={area}
                  area={getAreaTranslation(area)}
                  existingPhoto={photos.find((p) => p.area === area)?.url}
                  onCapture={(file) => handlePhotoCapture(area, file)}
                  disabled={uploadingArea !== null}
                />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Info */}
        <p className="px-4 text-center text-xs text-muted-foreground">{t("you_can_still_add")}</p>
      </div>

      {/* Fixed Bottom Button */}
      <div className="fixed bottom-0 left-0 right-0 border-t bg-background p-4">
        <Button
          size="xl"
          className="h-14 w-full gap-2 text-lg font-bold"
          onClick={handleContinue}
          disabled={!canContinue}
        >
          {t("continue_to_checklist")}
          <ArrowRight className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
