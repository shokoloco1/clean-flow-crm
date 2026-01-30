import { useMemo } from "react";
import { Clock, MapPin, User, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useJobStatusChange } from "@/hooks/useJobStatusChange";
import { QuickStatusChip } from "./QuickStatusButton";
import type { Job } from "./JobsList";

interface TodayKanbanProps {
  jobs: Job[];
  loading: boolean;
  onViewJob: (job: Job) => void;
  onJobsChange?: () => void;
}

type KanbanColumn = {
  id: string;
  title: string;
  status: string[];
  color: string;
  bgColor: string;
};

const columns: KanbanColumn[] = [
  { 
    id: "scheduled", 
    title: "Scheduled", 
    status: ["scheduled", "pending"], 
    color: "text-blue-600",
    bgColor: "bg-blue-50 dark:bg-blue-950/30"
  },
  { 
    id: "in_progress", 
    title: "In Progress", 
    status: ["in_progress"], 
    color: "text-amber-600",
    bgColor: "bg-amber-50 dark:bg-amber-950/30"
  },
  { 
    id: "completed", 
    title: "Completed", 
    status: ["completed"], 
    color: "text-emerald-600",
    bgColor: "bg-emerald-50 dark:bg-emerald-950/30"
  },
];

function JobCard({ 
  job, 
  onViewJob,
  updatingJobId,
  onAdvanceStatus
}: { 
  job: Job; 
  onViewJob: (job: Job) => void;
  updatingJobId: string | null;
  onAdvanceStatus: (jobId: string, status: string) => void;
}) {
  return (
    <button
      onClick={() => onViewJob(job)}
      className="w-full text-left bg-card border border-border rounded-lg p-3 hover:shadow-md transition-shadow cursor-pointer group"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <h4 className="font-medium text-sm text-foreground line-clamp-1">
          {job.clients?.name || "Unknown Client"}
        </h4>
        <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
      </div>
      
      <div className="space-y-1.5">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="h-3 w-3 shrink-0" />
          <span>{job.scheduled_time}</span>
        </div>
        
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <MapPin className="h-3 w-3 shrink-0" />
          <span className="line-clamp-1">{job.location}</span>
        </div>
        
        {job.profiles?.full_name && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <User className="h-3 w-3 shrink-0" />
            <span className="line-clamp-1">{job.profiles.full_name}</span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between mt-3">
        {!job.assigned_staff_id ? (
          <Badge variant="destructive" className="text-[10px]">
            Unassigned
          </Badge>
        ) : (
          <div />
        )}
        
        <QuickStatusChip
          currentStatus={job.status}
          isUpdating={updatingJobId === job.id}
          onAdvance={() => onAdvanceStatus(job.id, job.status)}
        />
      </div>
    </button>
  );
}

function KanbanColumnComponent({ 
  column, 
  jobs, 
  onViewJob,
  updatingJobId,
  onAdvanceStatus
}: { 
  column: KanbanColumn; 
  jobs: Job[];
  onViewJob: (job: Job) => void;
  updatingJobId: string | null;
  onAdvanceStatus: (jobId: string, status: string) => void;
}) {
  return (
    <div className="flex-shrink-0 w-72 md:w-80">
      <div className={cn("rounded-lg p-3", column.bgColor)}>
        <div className="flex items-center justify-between mb-3">
          <h3 className={cn("font-semibold text-sm", column.color)}>
            {column.title}
          </h3>
          <Badge variant="secondary" className="text-xs">
            {jobs.length}
          </Badge>
        </div>
        
        <div className="space-y-2 min-h-[200px]">
          {jobs.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">
              No jobs
            </p>
          ) : (
            jobs.map((job) => (
              <JobCard 
                key={job.id} 
                job={job} 
                onViewJob={onViewJob}
                updatingJobId={updatingJobId}
                onAdvanceStatus={onAdvanceStatus}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export function TodayKanban({ jobs, loading, onViewJob, onJobsChange }: TodayKanbanProps) {
  const { updatingJobId, advanceStatus } = useJobStatusChange(onJobsChange);
  const today = format(new Date(), "yyyy-MM-dd");
  
  const todayJobs = useMemo(() => 
    jobs.filter(job => job.scheduled_date === today),
    [jobs, today]
  );

  const jobsByColumn = useMemo(() => {
    return columns.reduce((acc, column) => {
      acc[column.id] = todayJobs.filter(job => 
        column.status.includes(job.status)
      ).sort((a, b) => a.scheduled_time.localeCompare(b.scheduled_time));
      return acc;
    }, {} as Record<string, Job[]>);
  }, [todayJobs]);

  const handleAdvanceStatus = (jobId: string, status: string) => {
    advanceStatus(jobId, status);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Today's Jobs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Today's Jobs</CardTitle>
          <Badge variant="outline" className="font-normal">
            {format(new Date(), "EEEE, MMM d")}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="px-3">
        <ScrollArea className="w-full">
          <div className="flex gap-3 pb-4">
            {columns.map((column) => (
              <KanbanColumnComponent
                key={column.id}
                column={column}
                jobs={jobsByColumn[column.id] || []}
                onViewJob={onViewJob}
                updatingJobId={updatingJobId}
                onAdvanceStatus={handleAdvanceStatus}
              />
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
