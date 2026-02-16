import { useMemo } from "react";
import { UserX, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, differenceInMinutes } from "date-fns";
import type { Job } from "./JobsList";

interface UrgentAlertsProps {
  jobs: Job[];
}

interface Alert {
  id: string;
  type: "unassigned" | "late_start";
  icon: typeof UserX;
  title: string;
  description: string;
  severity: "warning" | "danger";
}

export function UrgentAlerts({ jobs }: UrgentAlertsProps) {
  const today = format(new Date(), "yyyy-MM-dd");

  const alerts = useMemo(() => {
    const now = new Date();
    const todayJobs = jobs.filter((job) => job.scheduled_date === today);
    const alertsList: Alert[] = [];

    // Check for unassigned jobs
    const unassignedJobs = todayJobs.filter((job) => !job.assigned_staff_id);
    if (unassignedJobs.length > 0) {
      alertsList.push({
        id: "unassigned",
        type: "unassigned",
        icon: UserX,
        title: `${unassignedJobs.length} unassigned job${unassignedJobs.length > 1 ? "s" : ""}`,
        description: "Jobs need staff assignment before they can start",
        severity: "danger",
      });
    }

    // Check for late starts (scheduled but not started 15+ minutes past scheduled time)
    const lateJobs = todayJobs.filter((job) => {
      if (job.status !== "scheduled" || !job.assigned_staff_id) return false;

      const [hours, minutes] = job.scheduled_time.split(":").map(Number);
      const scheduledTime = new Date();
      scheduledTime.setHours(hours, minutes, 0, 0);

      const minutesLate = differenceInMinutes(now, scheduledTime);
      return minutesLate >= 15;
    });

    if (lateJobs.length > 0) {
      alertsList.push({
        id: "late_start",
        type: "late_start",
        icon: Clock,
        title: `${lateJobs.length} job${lateJobs.length > 1 ? "s" : ""} not started`,
        description: "Staff haven't checked in for scheduled jobs",
        severity: "warning",
      });
    }

    return alertsList;
  }, [jobs, today]);

  if (alerts.length === 0) return null;

  return (
    <div className="mb-4 space-y-2">
      {alerts.map((alert) => (
        <div
          key={alert.id}
          className={cn(
            "flex items-center gap-3 rounded-lg border px-4 py-3",
            alert.severity === "danger"
              ? "border-destructive/30 bg-destructive/10 text-destructive"
              : "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-400",
          )}
        >
          <alert.icon className="h-5 w-5 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">{alert.title}</p>
            <p
              className={cn(
                "text-xs",
                alert.severity === "danger"
                  ? "text-destructive/80"
                  : "text-amber-600 dark:text-amber-500",
              )}
            >
              {alert.description}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
