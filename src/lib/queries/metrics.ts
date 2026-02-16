import { supabase } from "@/integrations/supabase/client";
import { format, subDays, startOfMonth, endOfMonth } from "date-fns";

// --- Operational metrics ---

interface OperationalJob {
  id: string;
  status: string;
  scheduled_date: string;
  start_time: string | null;
  end_time: string | null;
  quality_score: number | null;
  assigned_staff_id: string | null;
  scheduled_time: string;
}

interface OperationalAlert {
  id: string;
  alert_type: string;
  is_resolved: boolean;
  job_id: string;
  created_at: string;
}

export interface OperationalMetricsData {
  jobs: OperationalJob[];
  alerts: OperationalAlert[];
  staffMap: Map<string, string>;
}

/** Fetch raw operational data (jobs, alerts, staff names) for a given period. */
export async function fetchOperationalMetrics(period: string): Promise<OperationalMetricsData> {
  const startDate = format(subDays(new Date(), parseInt(period)), "yyyy-MM-dd");
  const endDate = format(new Date(), "yyyy-MM-dd");

  const { data: jobs, error: jobsError } = await supabase
    .from("jobs")
    .select(
      "id, status, scheduled_date, start_time, end_time, quality_score, assigned_staff_id, scheduled_time",
    )
    .gte("scheduled_date", startDate)
    .lte("scheduled_date", endDate);

  if (jobsError) throw new Error(`Failed to load jobs: ${jobsError.message}`);

  const { data: alerts, error: alertsError } = await supabase
    .from("job_alerts")
    .select("id, alert_type, is_resolved, job_id, created_at")
    .gte("created_at", `${startDate}T00:00:00`)
    .lte("created_at", `${endDate}T23:59:59`);

  if (alertsError) throw new Error(`Failed to load alerts: ${alertsError.message}`);

  const staffIds = [
    ...new Set(jobs?.filter((j) => j.assigned_staff_id).map((j) => j.assigned_staff_id)),
  ] as string[];

  const { data: profiles } =
    staffIds.length > 0
      ? await supabase.from("profiles").select("user_id, full_name").in("user_id", staffIds)
      : { data: [] as { user_id: string; full_name: string }[] };

  const staffMap = new Map<string, string>();
  profiles?.forEach((p) => staffMap.set(p.user_id, p.full_name));

  return {
    jobs: (jobs as OperationalJob[]) || [],
    alerts: (alerts as OperationalAlert[]) || [],
    staffMap,
  };
}

// --- Business metrics ---

interface BusinessJob {
  id: string;
  status: string;
  assigned_staff_id: string | null;
  client_id: string | null;
  start_time: string | null;
  end_time: string | null;
}

interface BusinessInvoice {
  id: string;
  total: number;
  status: string;
  client_id: string | null;
}

interface BusinessClient {
  id: string;
  name: string;
}

export interface BusinessMetricsData {
  invoices: BusinessInvoice[];
  jobs: BusinessJob[];
  clients: BusinessClient[];
  staffMap: Map<string, string>;
}

export function getBusinessDateRange(period: string): { start: string; end: string } {
  const now = new Date();
  if (period === "month") {
    return {
      start: format(startOfMonth(now), "yyyy-MM-dd"),
      end: format(endOfMonth(now), "yyyy-MM-dd"),
    };
  }
  return {
    start: format(subDays(now, parseInt(period)), "yyyy-MM-dd"),
    end: format(now, "yyyy-MM-dd"),
  };
}

/** Fetch raw business data (invoices, jobs, clients, staff) for a given period. */
export async function fetchBusinessMetrics(period: string): Promise<BusinessMetricsData> {
  const { start, end } = getBusinessDateRange(period);

  const { data: invoices } = await supabase
    .from("invoices")
    .select("id, total, status, client_id")
    .gte("issue_date", start)
    .lte("issue_date", end);

  const { data: jobs } = await supabase
    .from("jobs")
    .select("id, status, assigned_staff_id, client_id, start_time, end_time")
    .gte("scheduled_date", start)
    .lte("scheduled_date", end);

  const { data: clients } = await supabase.from("clients").select("id, name");

  const staffIds = [
    ...new Set(jobs?.filter((j) => j.assigned_staff_id).map((j) => j.assigned_staff_id)),
  ] as string[];

  const { data: profiles } =
    staffIds.length > 0
      ? await supabase.from("profiles").select("user_id, full_name").in("user_id", staffIds)
      : { data: [] };

  const staffMap = new Map<string, string>();
  profiles?.forEach((p: { user_id: string; full_name: string }) =>
    staffMap.set(p.user_id, p.full_name),
  );

  return {
    invoices: (invoices as BusinessInvoice[]) || [],
    jobs: (jobs as BusinessJob[]) || [],
    clients: (clients as BusinessClient[]) || [],
    staffMap,
  };
}
