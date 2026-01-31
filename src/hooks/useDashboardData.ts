import { useCallback, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { useFetchWithRetry } from "@/hooks/useFetchWithRetry";

export interface Stats {
  todayJobs: number;
  activeStaff: number;
  completedToday: number;
  completionRate: number;
}

export interface Job {
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

interface DashboardData {
  jobs: Job[];
  stats: Stats;
}

export function useDashboardData() {
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const fetchDashboardData = useCallback(async (): Promise<DashboardData> => {
    // Use local date for filtering
    const today = format(new Date(), "yyyy-MM-dd");
    
    // Debug logging
    console.log('[Dashboard] Fetching data for date:', today);
    
    const [jobsRes, todayCountRes, completedCountRes] = await Promise.all([
      supabase
        .from("jobs")
        .select(`
          id, location, scheduled_date, scheduled_time, status,
          start_time, end_time, notes, created_at, assigned_staff_id,
          clients (name)
        `)
        .eq("scheduled_date", today)
        .order("scheduled_time", { ascending: true }),
      supabase
        .from("jobs")
        .select("*", { count: "exact", head: true })
        .eq("scheduled_date", today),
      supabase
        .from("jobs")
        .select("*", { count: "exact", head: true })
        .eq("scheduled_date", today)
        .eq("status", "completed"),
    ]);

    if (jobsRes.error) throw new Error(jobsRes.error.message);

    // Debug logging
    console.log('[Dashboard] Jobs found for today:', jobsRes.data?.length || 0, 'Date filter:', today);

    // Collect all staff IDs and fetch profiles in one query
    const allStaffIds = new Set<string>();
    jobsRes.data?.forEach((j: any) => j.assigned_staff_id && allStaffIds.add(j.assigned_staff_id));
    
    let staffMap: Record<string, string> = {};
    if (allStaffIds.size > 0) {
      const { data: staffData } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", Array.from(allStaffIds));
      staffMap = Object.fromEntries((staffData || []).map(s => [s.user_id, s.full_name]));
    }

    // Map staff names to jobs
    const jobsWithStaff = (jobsRes.data || []).map((job: any) => ({
      ...job,
      profiles: job.assigned_staff_id ? { full_name: staffMap[job.assigned_staff_id] || 'Unknown' } : null
    }));

    const todayTotal = todayCountRes.count || 0;
    const completedTotal = completedCountRes.count || 0;
    const rate = todayTotal > 0 ? Math.round((completedTotal / todayTotal) * 100) : 0;

    return {
      jobs: jobsWithStaff as Job[],
      stats: {
        todayJobs: todayTotal,
        activeStaff: 0,
        completedToday: completedTotal,
        completionRate: rate
      },
    };
  }, []);

  const { 
    data: dashboardData, 
    loading, 
    error, 
    isFromCache,
    retryCount,
    execute: refreshData,
    retry 
  } = useFetchWithRetry<DashboardData>(fetchDashboardData, {
    cacheKey: 'admin-dashboard-today',
    timeout: 8000,
    maxRetries: 2,
    retryDelay: 1500,
  });

  // Auto-refresh every 30 seconds
  useEffect(() => {
    refreshIntervalRef.current = setInterval(() => {
      console.log('[Dashboard] Auto-refreshing data...');
      refreshData();
    }, 30000);

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [refreshData]);

  // Refresh on visibility change (when user returns to tab)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('[Dashboard] Tab became visible, refreshing...');
        refreshData();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [refreshData]);

  const jobs = dashboardData?.jobs || [];
  const stats = dashboardData?.stats || { todayJobs: 0, activeStaff: 0, completedToday: 0, completionRate: 0 };
  const hasNoJobsToday = !loading && jobs.length === 0;

  return {
    jobs,
    stats,
    loading,
    error,
    isFromCache,
    retryCount,
    refreshData,
    retry,
    hasNoJobsToday,
  };
}
