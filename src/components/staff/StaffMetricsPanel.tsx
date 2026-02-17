import { type StaffMember } from "@/lib/queries/staff";
import { type StaffMetrics } from "@/hooks/useStaffMetrics";
import { Card, CardContent } from "@/components/ui/card";
import { Briefcase, Clock, Star, Calendar, TrendingUp } from "lucide-react";

interface StaffMetricsPanelProps {
  staff: StaffMember;
  metrics: StaffMetrics;
}

export function StaffMetricsPanel({ staff, metrics }: StaffMetricsPanelProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Briefcase className="mx-auto mb-2 h-8 w-8 text-primary" />
            <p className="text-2xl font-bold">{metrics.jobs_completed}</p>
            <p className="text-sm text-muted-foreground">Jobs Completed</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <Clock className="mx-auto mb-2 h-8 w-8 text-blue-500" />
            <p className="text-2xl font-bold">{metrics.total_hours.toFixed(1)}</p>
            <p className="text-sm text-muted-foreground">Hours Worked</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="rounded-full bg-yellow-500/10 p-3">
              <Star className="h-6 w-6 text-yellow-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Average Rating</p>
              <p className="text-2xl font-bold">
                {metrics.avg_quality_score
                  ? `${metrics.avg_quality_score.toFixed(1)} / 5.0`
                  : "No ratings yet"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {staff.hire_date && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-green-500/10 p-3">
                <Calendar className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tenure</p>
                <p className="text-2xl font-bold">
                  {(() => {
                    const months = Math.floor(
                      (new Date().getTime() - new Date(staff.hire_date!).getTime()) /
                        (1000 * 60 * 60 * 24 * 30),
                    );
                    if (months < 1) return "Less than 1 month";
                    if (months < 12) return `${months} month${months > 1 ? "s" : ""}`;
                    const years = Math.floor(months / 12);
                    const remainingMonths = months % 12;
                    return `${years} year${years > 1 ? "s" : ""}${remainingMonths > 0 ? ` and ${remainingMonths} month${remainingMonths > 1 ? "s" : ""}` : ""}`;
                  })()}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Since{" "}
                  {new Date(staff.hire_date).toLocaleDateString("en-AU", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {staff.hourly_rate && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-primary/10 p-3">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Estimated Earnings</p>
                <p className="text-2xl font-bold">
                  $
                  {(metrics.total_hours * staff.hourly_rate).toLocaleString("en-AU", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Based on {metrics.total_hours.toFixed(1)} hrs × ${staff.hourly_rate}/hr
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
