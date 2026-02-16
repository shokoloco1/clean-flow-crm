import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ClipboardList, Eye, RefreshCw, AlertTriangle, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { useJobStatusChange } from "@/hooks/useJobStatusChange";
import { QuickStatusButton } from "./QuickStatusButton";

export interface Job {
  id: string;
  location: string;
  scheduled_date: string;
  scheduled_time: string;
  status: string;
  start_time: string | null;
  end_time: string | null;
  notes: string | null;
  created_at?: string;
  assigned_staff_id?: string | null;
  clients: { name: string } | null;
  profiles: { full_name: string } | null;
}

interface JobsListProps {
  jobs: Job[];
  loading: boolean;
  error?: string | null;
  isRetrying?: boolean;
  onViewJob: (job: Job) => void;
  onRetry?: () => void;
  onJobsChange?: () => void;
}

function getStatusColor(status: string) {
  switch (status) {
    case "completed":
      return "bg-success/10 text-success";
    case "in_progress":
      return "bg-warning/10 text-warning";
    case "cancelled":
      return "bg-destructive/10 text-destructive";
    default:
      return "bg-muted text-muted-foreground";
  }
}

export function JobsList({
  jobs,
  loading,
  error,
  isRetrying,
  onViewJob,
  onRetry,
  onJobsChange,
}: JobsListProps) {
  const { updatingJobId, advanceStatus } = useJobStatusChange(onJobsChange);

  // Show error state when there's an error and no data
  const showError = error && jobs.length === 0;

  return (
    <Card className="border-border shadow-sm">
      <CardHeader>
        <div className="flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-primary" />
          <CardTitle>Upcoming Jobs</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {loading && !showError ? (
          <div className="flex flex-col items-center justify-center gap-3 py-12 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="text-sm">{isRetrying ? "Retrying..." : "Loading jobs..."}</span>
          </div>
        ) : showError ? (
          <div className="flex flex-col items-center justify-center gap-4 py-12">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle className="h-7 w-7 text-destructive" />
            </div>
            <div className="text-center">
              <p className="font-medium text-foreground">Something went wrong</p>
              <p className="mt-1 max-w-xs text-sm text-muted-foreground">
                {error || "Failed to load jobs. Please try again."}
              </p>
            </div>
            {onRetry && (
              <Button onClick={onRetry} variant="outline" className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Tap to retry
              </Button>
            )}
          </div>
        ) : jobs.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            No upcoming jobs scheduled. Create a new job to get started.
          </div>
        ) : (
          <div className="space-y-3">
            {jobs.map((job) => (
              <div
                key={job.id}
                className="flex cursor-pointer items-center justify-between rounded-lg bg-muted/50 p-4 transition-colors hover:bg-muted"
                onClick={() => onViewJob(job)}
              >
                <div className="flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <span className="font-medium text-foreground">
                      {job.clients?.name || "Unknown Client"}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${getStatusColor(job.status)}`}
                    >
                      {job.status.replace("_", " ")}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{job.location}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {format(new Date(job.scheduled_date), "MMM d, yyyy")} at {job.scheduled_time}
                    {job.profiles?.full_name && ` • ${job.profiles.full_name}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <QuickStatusButton
                    currentStatus={job.status}
                    isUpdating={updatingJobId === job.id}
                    onAdvance={() => advanceStatus(job.id, job.status)}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="View job details"
                    onClick={(e) => {
                      e.stopPropagation();
                      onViewJob(job);
                    }}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
