import {
  MapPin,
  Navigation,
  Clock,
  Bed,
  Bath,
  PawPrint,
  Timer,
  Play,
  CheckCircle2,
  Loader2,
  ListChecks,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useLanguage } from "@/hooks/useLanguage";

interface Property {
  bedrooms?: number | null;
  bathrooms?: number | null;
  has_pets?: boolean | null;
  estimated_hours?: number | null;
  google_maps_link?: string | null;
  address?: string;
}

interface ChecklistProgress {
  completed: number;
  total: number;
}

interface NextJobCardProps<
  T extends {
    id: string;
    location: string;
    scheduled_time: string;
    status: string;
    clients: { name: string } | null;
    properties: Property | null;
  },
> {
  job: T;
  isUpdating: boolean;
  onStartComplete: () => void;
  onViewDetails: () => void;
  checklistProgress?: ChecklistProgress | null;
}

export function NextJobCard<
  T extends {
    id: string;
    location: string;
    scheduled_time: string;
    status: string;
    clients: { name: string } | null;
    properties: Property | null;
  },
>({ job, isUpdating, onStartComplete, onViewDetails, checklistProgress }: NextJobCardProps<T>) {
  const { t } = useLanguage();
  const isInProgress = job.status === "in_progress";
  const isCompleted = job.status === "completed";
  const progressPercent =
    checklistProgress && checklistProgress.total > 0
      ? Math.round((checklistProgress.completed / checklistProgress.total) * 100)
      : 0;

  const openMaps = (e: React.MouseEvent) => {
    e.stopPropagation();
    const mapsUrl =
      job.properties?.google_maps_link ||
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(job.location)}`;
    window.open(mapsUrl, "_blank");
  };

  return (
    <Card className="border-2 border-primary bg-gradient-to-br from-primary/5 to-primary/10 shadow-lg">
      <CardContent className="p-4">
        {/* Header */}
        <div className="mb-3 flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wide text-primary">
            📍 {t("next_job")}
          </span>
          <span className="flex items-center gap-1 text-sm font-semibold text-foreground">
            <Clock className="h-4 w-4" />
            {job.scheduled_time}
          </span>
        </div>

        {/* Client Name */}
        <h2 className="mb-2 truncate text-xl font-bold text-foreground">
          {job.clients?.name || t("unknown_client")}
        </h2>

        {/* Property Quick Stats */}
        {job.properties && (
          <div className="mb-3 flex flex-wrap gap-3 text-sm text-muted-foreground">
            {(job.properties.bedrooms ?? 0) > 0 && (
              <span className="flex items-center gap-1">
                <Bed className="h-4 w-4" /> {job.properties.bedrooms}
              </span>
            )}
            {(job.properties.bathrooms ?? 0) > 0 && (
              <span className="flex items-center gap-1">
                <Bath className="h-4 w-4" /> {job.properties.bathrooms}
              </span>
            )}
            {job.properties.has_pets && (
              <span className="flex items-center gap-1 text-warning">
                <PawPrint className="h-4 w-4" /> {t("pets")}
              </span>
            )}
            {job.properties.estimated_hours && (
              <span className="flex items-center gap-1">
                <Timer className="h-4 w-4" /> ~{job.properties.estimated_hours}h
              </span>
            )}
          </div>
        )}

        {/* Checklist Progress - Only show when in progress and has tasks */}
        {isInProgress && checklistProgress && checklistProgress.total > 0 && (
          <div className="mb-3 rounded-lg bg-background/60 p-2">
            <div className="mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                <ListChecks className="h-3 w-3" />
                {t("tasks")}
              </span>
              <span className="text-xs font-semibold text-foreground">
                {checklistProgress.completed}/{checklistProgress.total}
              </span>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </div>
        )}

        {/* Address with Maps Button */}
        <div className="mb-4 flex items-start gap-2 rounded-lg bg-background/60 p-3">
          <MapPin className="mt-0.5 h-5 w-5 flex-shrink-0 text-muted-foreground" />
          <p className="line-clamp-2 flex-1 text-sm text-foreground">{job.location}</p>
          <Button size="sm" variant="secondary" className="flex-shrink-0 gap-1" onClick={openMaps}>
            <Navigation className="h-4 w-4" />
            {t("maps")}
          </Button>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          {!isCompleted && (
            <Button
              size="lg"
              className={`h-14 flex-1 text-lg font-semibold ${
                isInProgress ? "bg-success hover:bg-success/90" : "bg-primary hover:bg-primary/90"
              }`}
              onClick={(e) => {
                e.stopPropagation();
                onStartComplete();
              }}
              disabled={isUpdating}
            >
              {isUpdating ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : isInProgress ? (
                <>
                  <CheckCircle2 className="mr-2 h-6 w-6" />
                  {t("complete_job")}
                </>
              ) : (
                <>
                  <Play className="mr-2 h-6 w-6" />
                  {t("start_job")}
                </>
              )}
            </Button>
          )}

          {isCompleted && (
            <div className="flex h-14 flex-1 items-center justify-center rounded-lg bg-success/20">
              <CheckCircle2 className="mr-2 h-6 w-6 text-success" />
              <span className="text-lg font-semibold text-success">{t("status_completed")}</span>
            </div>
          )}

          <Button
            size="lg"
            variant="outline"
            className="h-14 px-4"
            onClick={(e) => {
              e.stopPropagation();
              onViewDetails();
            }}
          >
            {t("view_details")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
