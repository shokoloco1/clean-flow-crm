import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Download, FileSpreadsheet, Users, AlertTriangle, Briefcase, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format, subDays, startOfMonth, endOfMonth } from "date-fns";
import { logger } from "@/lib/logger";

type ReportType = "jobs" | "staff" | "alerts";

interface DateRange {
  startDate: string;
  endDate: string;
}

export function CSVReports() {
  const [reportType, setReportType] = useState<ReportType>("jobs");
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: format(startOfMonth(new Date()), "yyyy-MM-dd"),
    endDate: format(endOfMonth(new Date()), "yyyy-MM-dd"),
  });
  const [isGenerating, setIsGenerating] = useState(false);

  const setPresetRange = (preset: "week" | "month" | "quarter") => {
    const today = new Date();
    let startDate: Date;

    switch (preset) {
      case "week":
        startDate = subDays(today, 7);
        break;
      case "month":
        startDate = subDays(today, 30);
        break;
      case "quarter":
        startDate = subDays(today, 90);
        break;
    }

    setDateRange({
      startDate: format(startDate, "yyyy-MM-dd"),
      endDate: format(today, "yyyy-MM-dd"),
    });
  };

  const downloadCSV = (data: string, filename: string) => {
    const blob = new Blob([data], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const generateJobsReport = async () => {
    const { data: jobs, error } = await supabase
      .from("jobs")
      .select(
        `
        id,
        location,
        status,
        scheduled_date,
        scheduled_time,
        start_time,
        end_time,
        quality_score,
        geofence_validated,
        notes,
        property_id,
        assigned_staff_id
      `,
      )
      .gte("scheduled_date", dateRange.startDate)
      .lte("scheduled_date", dateRange.endDate)
      .order("scheduled_date", { ascending: false });

    if (error) throw error;

    // Fetch related data
    const staffIds = [
      ...new Set(jobs?.filter((j) => j.assigned_staff_id).map((j) => j.assigned_staff_id)),
    ];
    const propertyIds = [...new Set(jobs?.filter((j) => j.property_id).map((j) => j.property_id))];

    const [staffResult, propertiesResult] = await Promise.all([
      staffIds.length > 0
        ? supabase
            .from("profiles")
            .select("user_id, full_name")
            .in("user_id", staffIds as string[])
        : { data: [] as { user_id: string; full_name: string }[] },
      propertyIds.length > 0
        ? supabase
            .from("properties")
            .select("id, name, address")
            .in("id", propertyIds as string[])
        : { data: [] as { id: string; name: string; address: string | null }[] },
    ]);

    const staffMap = new Map<string, string>();
    staffResult.data?.forEach((s) => staffMap.set(s.user_id, s.full_name));

    const propertyMap = new Map<string, { name: string; address: string | null }>();
    propertiesResult.data?.forEach((p) =>
      propertyMap.set(p.id, { name: p.name, address: p.address }),
    );

    const headers = [
      "ID",
      "Date",
      "Scheduled Time",
      "Location",
      "Property",
      "Assigned Staff",
      "Status",
      "Start Time",
      "End Time",
      "Duration (min)",
      "Quality",
      "GPS Validated",
      "Notes",
    ];

    const rows =
      jobs?.map((job) => {
        const property = propertyMap.get(job.property_id || "");
        const duration =
          job.start_time && job.end_time
            ? Math.round(
                (new Date(job.end_time).getTime() - new Date(job.start_time).getTime()) / 60000,
              )
            : "";

        return [
          job.id,
          job.scheduled_date,
          job.scheduled_time,
          job.location,
          property?.name || "",
          staffMap.get(job.assigned_staff_id || "") || "",
          job.status,
          job.start_time ? format(new Date(job.start_time), "HH:mm") : "",
          job.end_time ? format(new Date(job.end_time), "HH:mm") : "",
          duration,
          job.quality_score || "",
          job.geofence_validated ? "Yes" : "No",
          (job.notes || "").replace(/"/g, '""'),
        ]
          .map((val) => `"${val}"`)
          .join(",");
      }) || [];

    return [headers.join(","), ...rows].join("\n");
  };

  const generateStaffReport = async () => {
    // Get all staff with their jobs in date range
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("user_id, full_name, email, phone, hire_date")
      .order("full_name");

    if (profilesError) throw profilesError;

    const { data: jobs, error: jobsError } = await supabase
      .from("jobs")
      .select(
        "id, assigned_staff_id, status, start_time, end_time, scheduled_date, scheduled_time, quality_score",
      )
      .gte("scheduled_date", dateRange.startDate)
      .lte("scheduled_date", dateRange.endDate);

    if (jobsError) throw jobsError;

    const { data: alerts, error: alertsError } = await supabase
      .from("job_alerts")
      .select("job_id, alert_type")
      .gte("created_at", `${dateRange.startDate}T00:00:00`)
      .lte("created_at", `${dateRange.endDate}T23:59:59`);

    if (alertsError) throw alertsError;

    // Create job to staff mapping for alerts
    const jobStaffMap = new Map(jobs?.map((j) => [j.id, j.assigned_staff_id]) || []);

    // Calculate stats per staff
    const staffStats =
      profiles?.map((profile) => {
        const staffJobs = jobs?.filter((j) => j.assigned_staff_id === profile.user_id) || [];
        const completedJobs = staffJobs.filter((j) => j.status === "completed");
        const staffAlerts =
          alerts?.filter((a) => jobStaffMap.get(a.job_id) === profile.user_id) || [];

        const lateArrivals = staffAlerts.filter((a) => a.alert_type === "late_arrival").length;
        const earlyDepartures = staffAlerts.filter(
          (a) => a.alert_type === "early_departure",
        ).length;
        const gpsIssues = staffAlerts.filter((a) => a.alert_type === "geofence_violation").length;

        const avgQuality =
          completedJobs.length > 0
            ? completedJobs.reduce((sum, j) => sum + (j.quality_score || 0), 0) /
              completedJobs.filter((j) => j.quality_score).length
            : 0;

        const totalMinutes = completedJobs.reduce((sum, j) => {
          if (j.start_time && j.end_time) {
            return (
              sum + (new Date(j.end_time).getTime() - new Date(j.start_time).getTime()) / 60000
            );
          }
          return sum;
        }, 0);

        return {
          ...profile,
          totalJobs: staffJobs.length,
          completedJobs: completedJobs.length,
          pendingJobs: staffJobs.filter((j) => j.status === "pending").length,
          inProgressJobs: staffJobs.filter((j) => j.status === "in_progress").length,
          avgQuality: avgQuality ? avgQuality.toFixed(1) : "N/A",
          totalHours: (totalMinutes / 60).toFixed(1),
          lateArrivals,
          earlyDepartures,
          gpsIssues,
          totalAlerts: lateArrivals + earlyDepartures + gpsIssues,
        };
      }) || [];

    const headers = [
      "Name",
      "Email",
      "Phone",
      "Hire Date",
      "Total Jobs",
      "Completed",
      "Pending",
      "In Progress",
      "Avg Quality",
      "Hours Worked",
      "Late Arrivals",
      "Early Departures",
      "GPS Issues",
      "Total Alerts",
    ];

    const rows = staffStats.map((staff) =>
      [
        staff.full_name,
        staff.email,
        staff.phone || "",
        staff.hire_date || "",
        staff.totalJobs,
        staff.completedJobs,
        staff.pendingJobs,
        staff.inProgressJobs,
        staff.avgQuality,
        staff.totalHours,
        staff.lateArrivals,
        staff.earlyDepartures,
        staff.gpsIssues,
        staff.totalAlerts,
      ]
        .map((val) => `"${val}"`)
        .join(","),
    );

    return [headers.join(","), ...rows].join("\n");
  };

  const generateAlertsReport = async () => {
    const { data: alerts, error } = await supabase
      .from("job_alerts")
      .select(
        `
        id,
        alert_type,
        message,
        is_resolved,
        resolved_at,
        created_at,
        job_id
      `,
      )
      .gte("created_at", `${dateRange.startDate}T00:00:00`)
      .lte("created_at", `${dateRange.endDate}T23:59:59`)
      .order("created_at", { ascending: false });

    if (error) throw error;

    // Get job details for context
    const jobIds = [...new Set(alerts?.map((a) => a.job_id))];
    const { data: jobs } = await supabase
      .from("jobs")
      .select("id, location, scheduled_date, assigned_staff_id")
      .in("id", jobIds);

    const staffIds = [
      ...new Set(jobs?.filter((j) => j.assigned_staff_id).map((j) => j.assigned_staff_id)),
    ] as string[];
    const { data: profiles } =
      staffIds.length > 0
        ? await supabase.from("profiles").select("user_id, full_name").in("user_id", staffIds)
        : { data: [] as { user_id: string; full_name: string }[] };

    const jobMap = new Map<string, typeof jobs extends (infer T)[] | null ? T : never>();
    jobs?.forEach((j) => jobMap.set(j.id, j));

    const staffMap = new Map<string, string>();
    profiles?.forEach((p) => staffMap.set(p.user_id, p.full_name));

    const alertTypeLabels: Record<string, string> = {
      late_arrival: "Late Arrival",
      early_departure: "Early Departure",
      geofence_violation: "Geofence Violation",
      no_show: "No Show",
    };

    const headers = [
      "ID",
      "Date/Time",
      "Type",
      "Staff",
      "Location",
      "Job Date",
      "Message",
      "Resolved",
      "Resolution Date",
    ];

    const rows =
      alerts?.map((alert) => {
        const job = jobMap.get(alert.job_id);
        const staffName = job ? staffMap.get(job.assigned_staff_id || "") : "";

        return [
          alert.id,
          format(new Date(alert.created_at), "yyyy-MM-dd HH:mm"),
          alertTypeLabels[alert.alert_type] || alert.alert_type,
          staffName || "",
          job?.location || "",
          job?.scheduled_date || "",
          (alert.message || "").replace(/"/g, '""'),
          alert.is_resolved ? "Yes" : "No",
          alert.resolved_at ? format(new Date(alert.resolved_at), "yyyy-MM-dd HH:mm") : "",
        ]
          .map((val) => `"${val}"`)
          .join(",");
      }) || [];

    return [headers.join(","), ...rows].join("\n");
  };

  const handleGenerateReport = async () => {
    setIsGenerating(true);
    try {
      let csvData: string;
      let filename: string;

      switch (reportType) {
        case "jobs":
          csvData = await generateJobsReport();
          filename = `jobs_${dateRange.startDate}_${dateRange.endDate}.csv`;
          break;
        case "staff":
          csvData = await generateStaffReport();
          filename = `staff_performance_${dateRange.startDate}_${dateRange.endDate}.csv`;
          break;
        case "alerts":
          csvData = await generateAlertsReport();
          filename = `alerts_${dateRange.startDate}_${dateRange.endDate}.csv`;
          break;
      }

      downloadCSV(csvData, filename);
      toast.success("Report generated successfully");
    } catch (error) {
      logger.error("Error generating report:", error);
      toast.error("Error generating report");
    } finally {
      setIsGenerating(false);
    }
  };

  const reportOptions = [
    {
      value: "jobs",
      label: "Job History",
      icon: Briefcase,
      description: "All jobs with dates, status, duration and staff",
    },
    {
      value: "staff",
      label: "Staff Performance",
      icon: Users,
      description: "Stats per employee: completed, punctuality, issues",
    },
    {
      value: "alerts",
      label: "Generated Alerts",
      icon: AlertTriangle,
      description: "Alert history: late arrivals, early departures, GPS",
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5" />
          Export CSV Reports
        </CardTitle>
        <CardDescription>Generate detailed reports for analysis and records</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Report Type Selection */}
        <div className="space-y-3">
          <Label>Report Type</Label>
          <div className="grid gap-3 md:grid-cols-3">
            {reportOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setReportType(option.value as ReportType)}
                className={`flex flex-col items-start gap-2 rounded-lg border p-4 text-left transition-all hover:bg-accent ${
                  reportType === option.value
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : "border-border"
                }`}
              >
                <div className="flex items-center gap-2">
                  <option.icon
                    className={`h-4 w-4 ${reportType === option.value ? "text-primary" : "text-muted-foreground"}`}
                  />
                  <span className="font-medium">{option.label}</span>
                </div>
                <span className="text-xs text-muted-foreground">{option.description}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Date Range */}
        <div className="space-y-3">
          <Label>Date Range</Label>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => setPresetRange("week")}>
              Last Week
            </Button>
            <Button variant="outline" size="sm" onClick={() => setPresetRange("month")}>
              Last Month
            </Button>
            <Button variant="outline" size="sm" onClick={() => setPresetRange("quarter")}>
              Last 3 Months
            </Button>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="startDate">From</Label>
              <Input
                id="startDate"
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange((prev) => ({ ...prev, startDate: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">To</Label>
              <Input
                id="endDate"
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange((prev) => ({ ...prev, endDate: e.target.value }))}
              />
            </div>
          </div>
        </div>

        {/* Generate Button */}
        <Button
          onClick={handleGenerateReport}
          disabled={isGenerating}
          className="w-full md:w-auto"
          size="lg"
        >
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" />
              Download CSV Report
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
