import { Clock, CheckCircle2, Play, MapPin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface TodayJobsListProps<T extends { id: string; location: string; scheduled_time: string; status: string; clients: { name: string } | null }> {
  jobs: T[];
  currentJobId?: string;
  onSelectJob: (job: T) => void;
}

export function TodayJobsList<T extends { id: string; location: string; scheduled_time: string; status: string; clients: { name: string } | null }>({ 
  jobs, currentJobId, onSelectJob 
}: TodayJobsListProps<T>) {
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
        return <Badge variant="secondary" className="bg-success/20 text-success text-xs">Done</Badge>;
      case "in_progress":
        return <Badge variant="secondary" className="bg-warning/20 text-warning text-xs">Active</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">Pending</Badge>;
    }
  };

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-muted-foreground px-1">
        📋 Today's Schedule ({jobs.length} jobs)
      </h3>
      
      <div className="space-y-2">
        {jobs.map((job) => {
          const isCurrent = job.id === currentJobId;
          
          return (
            <Card 
              key={job.id}
              className={`
                cursor-pointer active:scale-[0.98] transition-all
                ${isCurrent ? "ring-2 ring-primary bg-primary/5" : ""}
                ${job.status === "completed" ? "opacity-60" : ""}
              `}
              onClick={() => onSelectJob(job)}
            >
              <CardContent className="p-3">
                <div className="flex items-center gap-3">
                  {/* Status Icon */}
                  <div className="flex-shrink-0">
                    {getStatusIcon(job.status)}
                  </div>
                  
                  {/* Job Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-semibold text-foreground truncate">
                        {job.clients?.name || "Unknown"}
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
