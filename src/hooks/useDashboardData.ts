import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queries/keys";
import { fetchDashboardData } from "@/lib/queries/dashboard";
import { CONFIG } from "@/lib/config";

export type { DashboardStats as Stats, DashboardJob as Job } from "@/lib/queries/dashboard";

const DEFAULT_STATS = {
  todayJobs: 0,
  activeStaff: 0,
  completedToday: 0,
  completionRate: 0,
};

export function useDashboardData() {
  const queryClient = useQueryClient();

  const { data, isLoading, error, dataUpdatedAt } = useQuery({
    queryKey: queryKeys.dashboard.today(),
    queryFn: fetchDashboardData,
    staleTime: CONFIG.refresh.dashboard,
    refetchInterval: CONFIG.refresh.dashboard,
    refetchOnWindowFocus: true,
  });

  const refreshData = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.today() });
  }, [queryClient]);

  const jobs = data?.jobs ?? [];
  const stats = data?.stats ?? DEFAULT_STATS;

  return {
    jobs,
    stats,
    loading: isLoading,
    error: error?.message ?? null,
    isFromCache: dataUpdatedAt > 0 && !isLoading,
    retryCount: 0,
    refreshData,
    retry: refreshData,
    hasNoJobsToday: !isLoading && jobs.length === 0,
  };
}
