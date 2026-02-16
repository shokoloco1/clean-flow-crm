import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { logger } from "@/lib/logger";

export interface DashboardStats {
  todayJobs: number;
  activeStaff: number;
  completedToday: number;
  completionRate: number;
}

export interface DashboardJob {
  id: string;
  location: string;
  scheduled_date: string;
  scheduled_time: string;
  status: string;
  start_time: string | null;
  end_time: string | null;
  notes: string | null;
  created_at: string;
  assigned_staff_id: string | null;
  clients: { name: string } | null;
  profiles: { full_name: string } | null;
}

export interface DashboardData {
  jobs: DashboardJob[];
  stats: DashboardStats;
}

/** Fetch today's jobs with staff profiles and summary stats. */
export async function fetchDashboardData(): Promise<DashboardData> {
  const today = format(new Date(), "yyyy-MM-dd");
  logger.debug("[Dashboard] Fetching data for date:", today);

  const [jobsRes, todayCountRes, completedCountRes] = await Promise.all([
    supabase
      .from("jobs")
      .select(
        `id, location, scheduled_date, scheduled_time, status,
         start_time, end_time, notes, created_at, assigned_staff_id,
         clients (name)`,
      )
      .eq("scheduled_date", today)
      .order("scheduled_time", { ascending: true }),
    supabase.from("jobs").select("*", { count: "exact", head: true }).eq("scheduled_date", today),
    supabase
      .from("jobs")
      .select("*", { count: "exact", head: true })
      .eq("scheduled_date", today)
      .eq("status", "completed"),
  ]);

  if (jobsRes.error) throw new Error(jobsRes.error.message);

  logger.debug("[Dashboard] Jobs found for today:", {
    count: jobsRes.data?.length || 0,
    dateFilter: today,
  });

  // Batch-fetch staff profiles for all assigned jobs
  const staffIds = new Set<string>();
  jobsRes.data?.forEach((j) => {
    if (j.assigned_staff_id) staffIds.add(j.assigned_staff_id);
  });

  let staffMap: Record<string, string> = {};
  if (staffIds.size > 0) {
    const { data: staffData } = await supabase
      .from("profiles")
      .select("user_id, full_name")
      .in("user_id", Array.from(staffIds));
    staffMap = Object.fromEntries((staffData || []).map((s) => [s.user_id, s.full_name]));
  }

  const jobsWithStaff: DashboardJob[] = (jobsRes.data || []).map((job) => ({
    ...job,
    profiles: job.assigned_staff_id
      ? { full_name: staffMap[job.assigned_staff_id] || "Unknown" }
      : null,
  }));

  const todayTotal = todayCountRes.count || 0;
  const completedTotal = completedCountRes.count || 0;
  const rate = todayTotal > 0 ? Math.round((completedTotal / todayTotal) * 100) : 0;

  return {
    jobs: jobsWithStaff,
    stats: {
      todayJobs: todayTotal,
      activeStaff: 0,
      completedToday: completedTotal,
      completionRate: rate,
    },
  };
}
