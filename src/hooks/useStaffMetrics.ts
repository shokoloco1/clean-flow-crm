import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface StaffMetrics {
  user_id: string;
  jobs_completed: number;
  total_hours: number;
  avg_quality_score: number | null;
}

export function useStaffMetrics() {
  const { data: metricsData } = useQuery({
    queryKey: ["staff-metrics"],
    queryFn: async () => {
      const { data: jobs, error } = await supabase
        .from("jobs")
        .select("assigned_staff_id, status, start_time, end_time, quality_score")
        .eq("status", "completed")
        .limit(1000);

      if (error) throw error;

      const metricsMap: Record<string, StaffMetrics> = {};

      jobs.forEach((job) => {
        if (!job.assigned_staff_id) return;

        if (!metricsMap[job.assigned_staff_id]) {
          metricsMap[job.assigned_staff_id] = {
            user_id: job.assigned_staff_id,
            jobs_completed: 0,
            total_hours: 0,
            avg_quality_score: null,
          };
        }

        metricsMap[job.assigned_staff_id].jobs_completed++;

        if (job.start_time && job.end_time) {
          const start = new Date(job.start_time);
          const end = new Date(job.end_time);
          const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
          metricsMap[job.assigned_staff_id].total_hours += hours;
        }

        if (job.quality_score) {
          const current = metricsMap[job.assigned_staff_id];
          const totalScores =
            (current.avg_quality_score || 0) * (current.jobs_completed - 1) + job.quality_score;
          current.avg_quality_score = totalScores / current.jobs_completed;
        }
      });

      return metricsMap;
    },
  });

  const getMetrics = (userId: string): StaffMetrics => {
    return (
      metricsData?.[userId] || {
        user_id: userId,
        jobs_completed: 0,
        total_hours: 0,
        avg_quality_score: null,
      }
    );
  };

  const totalJobsCompleted = metricsData
    ? Object.values(metricsData).reduce((acc, m) => acc + m.jobs_completed, 0)
    : 0;

  const avgRating = metricsData
    ? Object.values(metricsData)
        .filter((m) => m.avg_quality_score)
        .reduce((acc, m) => acc + (m.avg_quality_score || 0), 0) /
      (Object.values(metricsData).filter((m) => m.avg_quality_score).length || 1)
    : 0;

  return { getMetrics, totalJobsCompleted, avgRating };
}
