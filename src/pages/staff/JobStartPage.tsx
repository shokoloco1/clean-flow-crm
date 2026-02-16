import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/hooks/useLanguage";
import { useJobWorkflow } from "@/hooks/useJobWorkflow";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowLeft,
  MapPin,
  Clock,
  Navigation,
  Bed,
  Bath,
  PawPrint,
  Timer,
  AlertCircle,
  Loader2,
  Play,
  FileText,
  Home,
} from "lucide-react";

interface JobData {
  id: string;
  location: string;
  scheduled_date: string;
  scheduled_time: string;
  status: string;
  notes: string | null;
  clients: {
    name: string;
    notes: string | null;
  } | null;
  properties: {
    name: string;
    address: string;
    bedrooms: number | null;
    bathrooms: number | null;
    has_pets: boolean | null;
    pet_details: string | null;
    estimated_hours: number | null;
    special_instructions: string | null;
    google_maps_link: string | null;
  } | null;
}

export default function JobStartPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { startJob, isStarting } = useJobWorkflow(id || "");

  const [job, setJob] = useState<JobData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchJob = async () => {
      if (!id) {
        setError("No job ID provided");
        setLoading(false);
        return;
      }

      try {
        const { data, error: fetchError } = await supabase
          .from("jobs")
          .select(
            `
            id,
            location,
            scheduled_date,
            scheduled_time,
            status,
            notes,
            clients (
              name,
              notes
            ),
            properties (
              name,
              address,
              bedrooms,
              bathrooms,
              has_pets,
              pet_details,
              estimated_hours,
              special_instructions,
              google_maps_link
            )
          `,
          )
          .eq("id", id)
          .single();

        if (fetchError) {
          throw fetchError;
        }

        setJob(data as JobData);
      } catch (err) {
        console.error("Error fetching job:", err);
        setError("Could not load job details");
      } finally {
        setLoading(false);
      }
    };

    fetchJob();
  }, [id]);

  const handleStartJob = async () => {
    const success = await startJob();
    if (success && id) {
      navigate(`/staff/job/${id}/photos-before`);
    }
  };

  const openMaps = () => {
    if (!job) return;
    const mapsUrl =
      job.properties?.google_maps_link ||
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(job.location)}`;
    window.open(mapsUrl, "_blank");
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

  // If job is already in progress, redirect to photos
  if (job.status === "in_progress") {
    navigate(`/staff/job/${id}/photos-before`, { replace: true });
    return null;
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b bg-background px-4 py-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/staff")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-lg font-semibold">{t("job_start_title")}</h1>
            <p className="text-xs text-muted-foreground">
              {job.scheduled_date} • {job.scheduled_time}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4 p-4">
        {/* Client Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <span className="text-xl">👤</span>
              {job.clients?.name || t("unknown_client")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Scheduled Time */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>
                {t("scheduled_time")}:{" "}
                <strong className="text-foreground">{job.scheduled_time}</strong>
              </span>
            </div>

            {/* Estimated Duration */}
            {job.properties?.estimated_hours && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Timer className="h-4 w-4" />
                <span>
                  ~{job.properties.estimated_hours}h {t("estimated")}
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Location Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <MapPin className="h-5 w-5 text-primary" />
              {t("location")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-3 text-sm text-foreground">{job.location}</p>
            <Button variant="secondary" className="w-full gap-2" onClick={openMaps}>
              <Navigation className="h-4 w-4" />
              {t("open_google_maps")}
            </Button>
          </CardContent>
        </Card>

        {/* Property Details Card */}
        {job.properties && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Home className="h-5 w-5 text-primary" />
                {t("property_details")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4 text-sm">
                {(job.properties.bedrooms ?? 0) > 0 && (
                  <div className="flex items-center gap-1.5">
                    <Bed className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {job.properties.bedrooms} {t("bedrooms")}
                    </span>
                  </div>
                )}
                {(job.properties.bathrooms ?? 0) > 0 && (
                  <div className="flex items-center gap-1.5">
                    <Bath className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {job.properties.bathrooms} {t("bathrooms")}
                    </span>
                  </div>
                )}
                {job.properties.has_pets && (
                  <div className="flex items-center gap-1.5 text-warning">
                    <PawPrint className="h-4 w-4" />
                    <span>{t("pets")}</span>
                  </div>
                )}
              </div>

              {job.properties.pet_details && (
                <p className="mt-2 rounded bg-warning/10 p-2 text-sm text-warning">
                  🐾 {job.properties.pet_details}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Notes Cards */}
        {(job.clients?.notes || job.notes || job.properties?.special_instructions) && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="h-5 w-5 text-primary" />
                {t("special_instructions")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {job.clients?.notes && (
                <div>
                  <p className="mb-1 text-xs uppercase text-muted-foreground">
                    {t("client_notes")}
                  </p>
                  <p className="rounded bg-muted/50 p-2 text-sm">{job.clients.notes}</p>
                </div>
              )}
              {job.notes && (
                <div>
                  <p className="mb-1 text-xs uppercase text-muted-foreground">
                    {t("service_notes")}
                  </p>
                  <p className="rounded bg-muted/50 p-2 text-sm">{job.notes}</p>
                </div>
              )}
              {job.properties?.special_instructions && (
                <div>
                  <p className="mb-1 text-xs uppercase text-muted-foreground">
                    {t("property_details")}
                  </p>
                  <p className="rounded bg-muted/50 p-2 text-sm">
                    {job.properties.special_instructions}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Fixed Bottom Button */}
      <div className="fixed bottom-0 left-0 right-0 border-t bg-background p-4">
        <Button
          size="xl"
          className="h-16 w-full gap-3 bg-success text-xl font-bold hover:bg-success/90"
          onClick={handleStartJob}
          disabled={isStarting}
        >
          {isStarting ? (
            <>
              <Loader2 className="h-6 w-6 animate-spin" />
              {t("starting_job")}
            </>
          ) : (
            <>
              <Play className="h-6 w-6" />
              {t("begin_work")}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
