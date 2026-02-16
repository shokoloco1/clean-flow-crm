import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/hooks/useLanguage";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, CheckCircle, Loader2, ImageIcon } from "lucide-react";
import { JobTimer } from "@/components/staff/JobTimer";
import { PhotoCapture } from "@/components/staff/PhotoCapture";
import { toast } from "sonner";

interface JobPhoto {
  id: string;
  photo_url: string;
  photo_type: string;
  area: string | null;
}

interface JobData {
  id: string;
  location: string;
  start_time: string | null;
  property?: {
    estimated_hours: number | null;
  } | null;
  client?: {
    name: string;
  } | null;
}

interface AreaComparison {
  area: string;
  beforePhoto: JobPhoto | null;
  afterPhoto: JobPhoto | null;
}

export default function JobPhotosAfterPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [job, setJob] = useState<JobData | null>(null);
  const [loading, setLoading] = useState(true);
  const [areaComparisons, setAreaComparisons] = useState<AreaComparison[]>([]);
  const [uploadingArea, setUploadingArea] = useState<string | null>(null);

  const fetchPhotos = useCallback(async () => {
    if (!id) return;

    const { data: photos, error } = await supabase
      .from("job_photos")
      .select("*")
      .eq("job_id", id)
      .order("created_at");

    if (error) {
      toast.error("Error loading photos");
      return;
    }

    // Group photos by area and type
    const beforePhotos = photos?.filter((p) => p.photo_type === "before") || [];
    const afterPhotos = photos?.filter((p) => p.photo_type === "after") || [];

    // Get unique areas from before photos
    const areas = [...new Set(beforePhotos.map((p) => p.area || "General"))];

    const comparisons: AreaComparison[] = areas.map((area) => ({
      area,
      beforePhoto: beforePhotos.find((p) => (p.area || "General") === area) || null,
      afterPhoto: afterPhotos.find((p) => (p.area || "General") === area) || null,
    }));

    setAreaComparisons(comparisons);
  }, [id]);

  useEffect(() => {
    if (id) {
      fetchJob();
      fetchPhotos();
    }
  }, [id, fetchPhotos]);

  const fetchJob = async () => {
    if (!id) return;

    const { data, error } = await supabase
      .from("jobs")
      .select(
        `
        id,
        location,
        start_time,
        property:properties(estimated_hours),
        client:clients(name)
      `,
      )
      .eq("id", id)
      .single();

    if (error) {
      toast.error("Error loading job");
      navigate("/staff");
      return;
    }

    const jobData: JobData = {
      id: data.id,
      location: data.location,
      start_time: data.start_time,
      property: Array.isArray(data.property) ? data.property[0] : data.property,
      client: Array.isArray(data.client) ? data.client[0] : data.client,
    };

    setJob(jobData);
    setLoading(false);
  };

  const handlePhotoCapture = async (file: File, area: string) => {
    if (!id) return;

    setUploadingArea(area);

    const fileExt = file.name.split(".").pop();
    const fileName = `${id}/after-${area.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}.${fileExt}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("job-evidence")
      .upload(fileName, file, { cacheControl: "3600" });

    if (uploadError) {
      toast.error(t("failed_upload"));
      setUploadingArea(null);
      return;
    }

    const { data: urlData } = supabase.storage.from("job-evidence").getPublicUrl(uploadData.path);

    const { error: insertError } = await supabase.from("job_photos").insert({
      job_id: id,
      photo_url: urlData.publicUrl,
      photo_type: "after",
      area: area,
      taken_at: new Date().toISOString(),
    });

    if (insertError) {
      toast.error(t("failed_upload"));
    } else {
      toast.success(`${area} - ${t("photo_saved")}`);
      fetchPhotos();
    }

    setUploadingArea(null);
  };

  const afterPhotosCount = areaComparisons.filter((c) => c.afterPhoto).length;
  const totalAreas = areaComparisons.length;
  const canFinish = afterPhotosCount >= Math.min(3, totalAreas);

  const handleFinish = () => {
    navigate(`/staff/job/${id}/complete`);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!job) {
    return null;
  }

  const startedAt = job.start_time ? new Date(job.start_time) : null;

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-border bg-background">
        <div className="flex items-center justify-between p-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/staff/job/${id}/checklist`)}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("go_back")}
          </Button>

          {startedAt && (
            <JobTimer
              startedAt={startedAt}
              estimatedHours={job.property?.estimated_hours ?? undefined}
              compact
            />
          )}
        </div>
      </div>

      {/* Content */}
      <div className="space-y-4 p-4">
        {/* Title */}
        <div className="space-y-1 text-center">
          <h1 className="text-xl font-bold text-foreground">{t("photos_after_title")}</h1>
          <p className="text-sm text-muted-foreground">{t("capture_after_state")}</p>
          <p className="text-sm font-medium text-primary">
            {afterPhotosCount}/{totalAreas} {t("photos_progress")}
          </p>
        </div>

        {/* Area Comparisons */}
        <div className="space-y-4">
          {areaComparisons.map((comparison) => (
            <Card key={comparison.area} className="overflow-hidden border-border">
              <CardContent className="p-4">
                <h3 className="mb-3 font-medium text-foreground">{comparison.area}</h3>

                <div className="grid grid-cols-2 gap-3">
                  {/* Before Photo */}
                  <div className="space-y-1">
                    <p className="text-center text-xs text-muted-foreground">{t("before")}</p>
                    {comparison.beforePhoto ? (
                      <div className="aspect-square overflow-hidden rounded-lg bg-muted">
                        <img
                          src={comparison.beforePhoto.photo_url}
                          alt={`${comparison.area} before`}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="flex aspect-square items-center justify-center rounded-lg bg-muted">
                        <ImageIcon className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                  </div>

                  {/* After Photo */}
                  <div className="space-y-1">
                    <p className="text-center text-xs text-muted-foreground">{t("after")}</p>
                    {comparison.afterPhoto ? (
                      <div className="relative aspect-square overflow-hidden rounded-lg bg-muted">
                        <img
                          src={comparison.afterPhoto.photo_url}
                          alt={`${comparison.area} after`}
                          className="h-full w-full object-cover"
                        />
                        <div className="absolute right-2 top-2 rounded-full bg-success p-1 text-success-foreground">
                          <CheckCircle className="h-4 w-4" />
                        </div>
                      </div>
                    ) : (
                      <PhotoCapture
                        area={comparison.area}
                        onCapture={(file) => handlePhotoCapture(file, comparison.area)}
                        disabled={uploadingArea === comparison.area}
                        compact
                      />
                    )}
                  </div>
                </div>

                {/* Retake option if after photo exists */}
                {comparison.afterPhoto && (
                  <div className="mt-2">
                    <PhotoCapture
                      area={comparison.area}
                      existingPhoto={comparison.afterPhoto.photo_url}
                      onCapture={(file) => handlePhotoCapture(file, comparison.area)}
                      disabled={uploadingArea === comparison.area}
                      retakeMode
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {areaComparisons.length === 0 && (
          <Card className="border-border">
            <CardContent className="p-8 text-center">
              <ImageIcon className="mx-auto mb-3 h-12 w-12 text-muted-foreground" />
              <p className="text-muted-foreground">{t("no_photos_yet")}</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Bottom Action */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-background p-4">
        <Button
          onClick={handleFinish}
          disabled={!canFinish}
          className="h-14 w-full gap-2 text-lg font-semibold"
          size="lg"
        >
          <CheckCircle className="h-5 w-5" />
          {t("finish_job")}
        </Button>
        {!canFinish && (
          <p className="mt-2 text-center text-sm text-muted-foreground">{t("minimum_photos")}</p>
        )}
      </div>
    </div>
  );
}
