import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { queryKeys } from "@/lib/queries/keys";
import { toast } from "sonner";
import type { TimeEntryWithDetails } from "@/types/time-tracking";

interface UseTimeEntriesFilters {
  staffId?: string;
  dateFrom?: string; // ISO date string
  dateTo?: string; // ISO date string
  jobId?: string;
}

export function useTimeEntries(filters: UseTimeEntriesFilters = {}) {
  const { user, role } = useAuth();
  const queryClient = useQueryClient();

  const effectiveStaffId = role === "staff" ? user?.id : filters.staffId;

  const { data: entries = [], isLoading } = useQuery({
    queryKey: queryKeys.timeEntries.list({
      staffId: effectiveStaffId,
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo,
    }),
    queryFn: async () => {
      let query = (supabase as any)
        .from("time_entries")
        .select(
          `
          *,
          profiles!time_entries_staff_id_fkey (full_name, email),
          jobs!time_entries_job_id_fkey (
            location,
            scheduled_date,
            scheduled_time,
            clients (name)
          )
        `,
        )
        .order("clock_in", { ascending: false });

      if (effectiveStaffId) {
        query = query.eq("staff_id", effectiveStaffId);
      }

      if (filters.dateFrom) {
        query = query.gte("clock_in", `${filters.dateFrom}T00:00:00.000Z`);
      }

      if (filters.dateTo) {
        query = query.lte("clock_in", `${filters.dateTo}T23:59:59.999Z`);
      }

      if (filters.jobId) {
        query = query.eq("job_id", filters.jobId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as TimeEntryWithDetails[];
    },
    enabled: !!user?.id,
  });

  // Compute totals
  const completedEntries = entries.filter((e) => e.status === "completed");
  const totalMinutes = completedEntries.reduce(
    (sum, e) => sum + (e.billable_minutes ?? e.total_minutes ?? 0),
    0,
  );
  const totalHours = Math.round((totalMinutes / 60) * 100) / 100;

  // Admin: edit an entry
  const editEntry = async (
    entryId: string,
    updates: {
      clock_in?: string;
      clock_out?: string;
      break_minutes?: number;
      total_minutes?: number;
      admin_notes?: string;
      status?: string;
    },
  ) => {
    if (role !== "admin") {
      toast.error("Only admins can edit entries");
      return;
    }

    try {
      const { error } = await (supabase as any)
        .from("time_entries")
        .update({
          ...updates,
          edited_by: user!.id,
          edited_at: new Date().toISOString(),
          status: updates.status ?? "edited",
        })
        .eq("id", entryId);

      if (error) throw error;

      toast.success("Entry updated");
      queryClient.invalidateQueries({ queryKey: queryKeys.timeEntries.all() });
    } catch (err) {
      console.error("Edit entry error:", err);
      toast.error("Failed to update entry");
    }
  };

  // Admin: force clock out a stale entry
  const forceClockOut = async (entryId: string, clockOutTime?: string) => {
    if (role !== "admin") return;

    const entry = entries.find((e) => e.id === entryId);
    if (!entry) return;

    const clockOut = clockOutTime ?? new Date().toISOString();
    const clockIn = new Date(entry.clock_in);
    const totalMinutes = Math.round((new Date(clockOut).getTime() - clockIn.getTime()) / 60000);

    await editEntry(entryId, {
      clock_out: clockOut,
      total_minutes: totalMinutes,
      status: "edited",
      admin_notes: "Force closed by admin — staff forgot to clock out",
    });
  };

  return {
    entries,
    totalHours,
    totalMinutes,
    isLoading,
    editEntry,
    forceClockOut,
  };
}
