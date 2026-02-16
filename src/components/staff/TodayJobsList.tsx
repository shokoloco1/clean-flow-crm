import { Clock, CheckCircle2, Play, MapPin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/hooks/useLanguage";

interface TodayJobsListProps<
  T extends {
    id: string;
    location: string;
    scheduled_time: string;
    status: string;
    clients: { name: string } | null;
  },
> {
  jobs: T[];
  currentJobId?: string;
  onSelectJob: (job: T) => void;
}

export function TodayJobsList<
  T extends {
    id: string;
    location: string;
    scheduled_time: string;
    status: string;
    clients: { name: string } | null;
  },
>({ jobs, currentJobId, onSelectJob }: TodayJobsListProps<T>) {
  const { t } = useLanguage();

  if (jobs.length === 0) return null;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="h-4 w-4 text-success" />;
      case "in_progress":
        return <Play className="h-4 w-4 text-warning" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <Badge variant="secondary" className="bg-success/20 text-xs text-success">
            {t("status_done")}
          </Badge>
        );
      case "in_progress":
        return (
          <Badge variant="secondary" className="bg-warning/20 text-xs text-warning">
            {t("status_active")}
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-xs">
            {t("status_pending")}
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-2">
      <h3 className="px-1 text-sm font-semibold text-muted-foreground">
        📋 {t("todays_schedule")} ({jobs.length} {t("jobs_count")})
      </h3>

      <div className="space-y-2">
        {jobs.map((job) => {
          const isCurrent = job.id === currentJobId;

          return (
            <Card
              key={job.id}
              className={`cursor-pointer transition-all active:scale-[0.98] ${isCurrent ? "bg-primary/5 ring-2 ring-primary" : ""} ${job.status === "completed" ? "opacity-60" : ""} `}
              onClick={() => onSelectJob(job)}
            >
              <CardContent className="p-3">
                <div className="flex items-center gap-3">
                  {/* Status Icon */}
                  <div className="flex-shrink-0">{getStatusIcon(job.status)}</div>

                  {/* Job Info */}
                  <div className="min-w-0 flex-1">
                    <div className="mb-0.5 flex items-center gap-2">
                      <span className="truncate font-semibold text-foreground">
                        {job.clients?.name || t("unknown_client")}
                      </span>
                      {getStatusBadge(job.status)}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      <span className="truncate">{job.location}</span>
                    </div>
                  </div>

                  {/* Time */}
                  <div className="flex-shrink-0 text-sm font-medium text-muted-foreground">
                    {job.scheduled_time}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
