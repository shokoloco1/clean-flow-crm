import { format } from "date-fns";
import {
  Calendar,
  Clock,
  User,
  CheckCircle2,
  PlayCircle,
  XCircle,
  Camera,
  ClipboardCheck,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TimelineEvent {
  id: string;
  type: "created" | "started" | "completed" | "cancelled" | "photo" | "checklist" | "alert" | "assigned";
  title: string;
  description?: string;
  timestamp: string;
  metadata?: Record<string, string>;
}

interface JobTimelineProps {
  job: {
    id: string;
    created_at?: string;
    start_time?: string | null;
    end_time?: string | null;
    status: string;
    scheduled_date: string;
    scheduled_time: string;
  };
  photos?: { created_at: string; photo_type: string }[];
  checklistItems?: { completed_at: string | null; task_name: string }[];
  alerts?: { created_at: string; message: string; is_resolved: boolean }[];
}

export function JobTimeline({ job, photos = [], checklistItems = [], alerts = [] }: JobTimelineProps) {
  const events: TimelineEvent[] = [];

  // Job created event
  if (job.created_at) {
    events.push({
      id: "created",
      type: "created",
      title: "Job created",
      description: `Scheduled: ${job.scheduled_date} at ${job.scheduled_time}`,
      timestamp: job.created_at,
    });
  }

  // Job started event
  if (job.start_time) {
    events.push({
      id: "started",
      type: "started",
      title: "Job started",
      description: "Location verified",
      timestamp: job.start_time,
    });
  }

  // Photos events
  photos.forEach((photo, index) => {
    events.push({
      id: `photo-${index}`,
      type: "photo",
      title: `${photo.photo_type === "before" ? "Before" : "After"} photo uploaded`,
      timestamp: photo.created_at,
    });
  });

  // Checklist completed events
  checklistItems.forEach((item, index) => {
    if (item.completed_at) {
      events.push({
        id: `checklist-${index}`,
        type: "checklist",
        title: "Task completed",
        description: item.task_name,
        timestamp: item.completed_at,
      });
    }
  });

  // Alert events
  alerts.forEach((alert, index) => {
    events.push({
      id: `alert-${index}`,
      type: "alert",
      title: "Alert generated",
      description: alert.message,
      timestamp: alert.created_at,
      metadata: { resolved: alert.is_resolved ? "Resolved" : "Pending" },
    });
  });

  // Job completed event
  if (job.end_time && job.status === "completed") {
    events.push({
      id: "completed",
      type: "completed",
      title: "Job completed",
      description: "All tasks finished successfully",
      timestamp: job.end_time,
    });
  }

  // Job cancelled event
  if (job.status === "cancelled") {
    events.push({
      id: "cancelled",
      type: "cancelled",
      title: "Job cancelled",
      timestamp: job.end_time || job.created_at || new Date().toISOString(),
    });
  }

  // Sort events by timestamp
  events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  const getEventIcon = (type: TimelineEvent["type"]) => {
    switch (type) {
      case "created":
        return <Calendar className="h-4 w-4" />;
      case "started":
        return <PlayCircle className="h-4 w-4" />;
      case "completed":
        return <CheckCircle2 className="h-4 w-4" />;
      case "cancelled":
        return <XCircle className="h-4 w-4" />;
      case "photo":
        return <Camera className="h-4 w-4" />;
      case "checklist":
        return <ClipboardCheck className="h-4 w-4" />;
      case "alert":
        return <AlertTriangle className="h-4 w-4" />;
      case "assigned":
        return <User className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getEventColor = (type: TimelineEvent["type"]) => {
    switch (type) {
      case "created":
        return "bg-blue-500/10 text-blue-600 border-blue-500/30";
      case "started":
        return "bg-yellow-500/10 text-yellow-600 border-yellow-500/30";
      case "completed":
        return "bg-green-500/10 text-green-600 border-green-500/30";
      case "cancelled":
        return "bg-red-500/10 text-red-600 border-red-500/30";
      case "photo":
        return "bg-purple-500/10 text-purple-600 border-purple-500/30";
      case "checklist":
        return "bg-teal-500/10 text-teal-600 border-teal-500/30";
      case "alert":
        return "bg-orange-500/10 text-orange-600 border-orange-500/30";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  if (events.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>No events recorded yet</p>
      </div>
    );
  }

  return (
    <div className="relative space-y-4">
      {/* Timeline line */}
      <div className="absolute left-[19px] top-2 bottom-2 w-0.5 bg-border" />

      {events.map((event) => (
        <div key={event.id} className="relative flex gap-4">
          {/* Icon */}
          <div
            className={cn(
              "relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2",
              getEventColor(event.type)
            )}
          >
            {getEventIcon(event.type)}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0 pb-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-medium text-foreground">{event.title}</p>
                {event.description && (
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {event.description}
                  </p>
                )}
                {event.metadata && (
                  <div className="flex gap-2 mt-1">
                    {Object.entries(event.metadata).map(([key, value]) => (
                      <span
                        key={key}
                        className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground"
                      >
                        {value}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <time className="text-xs text-muted-foreground whitespace-nowrap">
                {format(new Date(event.timestamp), "d MMM, HH:mm")}
              </time>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}