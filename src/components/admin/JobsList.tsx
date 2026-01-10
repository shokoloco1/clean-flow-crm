import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ClipboardList, Eye } from "lucide-react";
import { format } from "date-fns";

export interface Job {
  id: string;
  location: string;
  scheduled_date: string;
  scheduled_time: string;
  status: string;
  start_time: string | null;
  end_time: string | null;
  notes: string | null;
  clients: { name: string } | null;
  profiles: { full_name: string } | null;
}

interface JobsListProps {
  jobs: Job[];
  loading: boolean;
  onViewJob: (job: Job) => void;
}

function getStatusColor(status: string) {
  switch (status) {
    case "completed": return "bg-success/10 text-success";
    case "in_progress": return "bg-warning/10 text-warning";
    case "cancelled": return "bg-destructive/10 text-destructive";
    default: return "bg-muted text-muted-foreground";
  }
}

export function JobsList({ jobs, loading, onViewJob }: JobsListProps) {
  return (
    <Card className="border-border shadow-sm">
      <CardHeader>
        <div className="flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-primary" />
          <CardTitle>Upcoming Jobs</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        ) : jobs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No upcoming jobs scheduled. Create a new job to get started.
          </div>
        ) : (
          <div className="space-y-3">
            {jobs.map((job) => (
              <div
                key={job.id}
                className="flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
                onClick={() => onViewJob(job)}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-foreground">
                      {job.clients?.name || "Unknown Client"}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(job.status)}`}>
                      {job.status.replace("_", " ")}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{job.location}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {format(new Date(job.scheduled_date), "MMM d, yyyy")} at {job.scheduled_time}
                    {job.profiles?.full_name && ` • ${job.profiles.full_name}`}
                  </p>
                </div>
                <Button variant="ghost" size="icon">
                  <Eye className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
