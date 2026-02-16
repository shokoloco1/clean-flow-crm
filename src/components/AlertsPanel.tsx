import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, Clock, AlertTriangle, MapPin, CheckCircle, X } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface JobAlert {
  id: string;
  job_id: string;
  alert_type: string;
  message: string;
  is_resolved: boolean;
  created_at: string;
  jobs?: {
    location: string;
    scheduled_time: string;
    profiles?: { full_name: string } | null;
  };
}

export default function AlertsPanel() {
  const [alerts, setAlerts] = useState<JobAlert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAlerts();

    // Subscribe to real-time alerts
    const channel = supabase
      .channel("admin-alerts")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "job_alerts",
        },
        (payload) => {
          // Play notification sound or show toast
          toast.warning("New alert received", {
            description: (payload.new as JobAlert).message,
          });
          fetchAlerts();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchAlerts = async () => {
    const { data, error } = await supabase
      .from("job_alerts")
      .select(
        `
        id,
        job_id,
        alert_type,
        message,
        is_resolved,
        created_at,
        jobs (
          location,
          scheduled_time,
          assigned_staff_id
        )
      `,
      )
      .eq("is_resolved", false)
      .order("created_at", { ascending: false })
      .limit(20);

    if (!error && data) {
      // Fetch staff names separately
      type AlertData = {
        id: string;
        job_id: string;
        alert_type: string;
        message: string;
        is_resolved: boolean;
        created_at: string;
        jobs: { location: string; scheduled_time: string; assigned_staff_id: string | null } | null;
      };
      const staffIds = [
        ...new Set(
          (data as AlertData[])
            .map((a) => a.jobs?.assigned_staff_id)
            .filter((id): id is string => Boolean(id)),
        ),
      ];

      let staffMap: Record<string, string> = {};
      if (staffIds.length > 0) {
        const { data: staffData } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", staffIds);
        staffMap = Object.fromEntries((staffData || []).map((s) => [s.user_id, s.full_name]));
      }

      const alertsWithStaff = (data as AlertData[]).map((alert) => ({
        ...alert,
        jobs: alert.jobs
          ? {
              ...alert.jobs,
              profiles: alert.jobs.assigned_staff_id
                ? { full_name: staffMap[alert.jobs.assigned_staff_id] || "Unknown" }
                : null,
            }
          : undefined,
      }));

      setAlerts(alertsWithStaff as JobAlert[]);
    }
    setLoading(false);
  };

  const resolveAlert = async (alertId: string) => {
    const { error } = await supabase
      .from("job_alerts")
      .update({
        is_resolved: true,
        resolved_at: new Date().toISOString(),
      })
      .eq("id", alertId);

    if (!error) {
      setAlerts(alerts.filter((a) => a.id !== alertId));
      toast.success("Alert resolved");
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case "late_arrival":
        return <Clock className="h-4 w-4" />;
      case "no_show":
        return <AlertTriangle className="h-4 w-4" />;
      case "geofence_violation":
        return <MapPin className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const getAlertColor = (type: string) => {
    switch (type) {
      case "late_arrival":
        return "bg-warning/10 text-warning border-warning/30";
      case "no_show":
        return "bg-destructive/10 text-destructive border-destructive/30";
      case "geofence_violation":
        return "bg-orange-500/10 text-orange-500 border-orange-500/30";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  const getAlertLabel = (type: string) => {
    switch (type) {
      case "late_arrival":
        return "Late Arrival";
      case "no_show":
        return "No Show";
      case "geofence_violation":
        return "Outside Area";
      case "early_checkout":
        return "Early Checkout";
      default:
        return type;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-4">
          <p className="text-center text-muted-foreground">Loading alerts...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-lg">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-destructive" />
            Active Alerts
          </div>
          {alerts.length > 0 && <Badge variant="destructive">{alerts.length}</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {alerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-success/10">
              <CheckCircle className="h-6 w-6 text-success" />
            </div>
            <p className="text-muted-foreground">No pending alerts</p>
          </div>
        ) : (
          <div className="space-y-3">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className={`rounded-lg border p-4 ${getAlertColor(alert.alert_type)}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">{getAlertIcon(alert.alert_type)}</div>
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {getAlertLabel(alert.alert_type)}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(alert.created_at), "h:mm a")}
                        </span>
                      </div>
                      <p className="text-sm font-medium">{alert.message}</p>
                      {alert.jobs && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {alert.jobs.profiles?.full_name} • {alert.jobs.location}
                        </p>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={() => resolveAlert(alert.id)}
                    aria-label="Resolve alert"
                  >
                    <X className="h-4 w-4" />
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
