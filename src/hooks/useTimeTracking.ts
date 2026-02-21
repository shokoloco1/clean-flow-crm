import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { queryKeys } from "@/lib/queries/keys";
import { toast } from "sonner";
import type { TimeEntry } from "@/types/time-tracking";

const STALE_ENTRY_HOURS = 12;

interface GpsLocation {
  lat: number;
  lng: number;
}

async function captureGps(): Promise<GpsLocation | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  });
}

export function useTimeTracking(jobId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isClockingIn, setIsClockingIn] = useState(false);
  const [isClockingOut, setIsClockingOut] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch active entry for this staff member (across all jobs)
  const { data: activeEntry = null, isLoading } = useQuery({
    queryKey: queryKeys.timeEntries.active(user?.id ?? ""),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("time_entries")
        .select("*")
        .eq("staff_id", user!.id)
        .eq("status", "active")
        .is("clock_out", null)
        .order("clock_in", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as TimeEntry | null;
    },
    enabled: !!user?.id,
    staleTime: 30000,
  });

  const isClockedIn = !!activeEntry;
  const isClockedInToThisJob = !!activeEntry && activeEntry.job_id === jobId;
  const isClockedInToOtherJob = !!activeEntry && jobId != null && activeEntry.job_id !== jobId;

  // Check if entry is stale (>12 hours)
  const isStaleEntry =
    activeEntry != null &&
    (Date.now() - new Date(activeEntry.clock_in).getTime()) / (1000 * 60 * 60) > STALE_ENTRY_HOURS;

  // Live timer
  useEffect(() => {
    if (activeEntry) {
      const clockInTime = new Date(activeEntry.clock_in).getTime();
      const updateElapsed = () => {
        setElapsedSeconds(Math.floor((Date.now() - clockInTime) / 1000));
      };
      updateElapsed();
      intervalRef.current = setInterval(updateElapsed, 1000);
      return () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
      };
    } else {
      setElapsedSeconds(0);
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
  }, [activeEntry]);

  const clockIn = useCallback(
    async (targetJobId?: string) => {
      const jId = targetJobId ?? jobId;
      if (!user?.id || !jId) return;
      if (isClockedIn) {
        toast.error("You are already clocked in. Clock out first.");
        return;
      }

      setIsClockingIn(true);
      try {
        const location = await captureGps();
        const { error } = await supabase.from("time_entries").insert({
          job_id: jId,
          staff_id: user.id,
          clock_in: new Date().toISOString(),
          clock_in_lat: location?.lat ?? null,
          clock_in_lng: location?.lng ?? null,
          status: "active",
        });

        if (error) throw error;

        toast.success("Clocked in!");
        queryClient.invalidateQueries({ queryKey: queryKeys.timeEntries.active(user.id) });
        if (jId) {
          queryClient.invalidateQueries({ queryKey: queryKeys.timeEntries.byJob(jId) });
        }
      } catch (err) {
        console.error("Clock in error:", err);
        toast.error("Failed to clock in");
      } finally {
        setIsClockingIn(false);
      }
    },
    [user?.id, jobId, isClockedIn, queryClient],
  );

  const clockOut = useCallback(
    async (breakMinutes?: number, notes?: string) => {
      if (!user?.id || !activeEntry) return;

      setIsClockingOut(true);
      try {
        const location = await captureGps();
        const clockOutTime = new Date();
        const clockInTime = new Date(activeEntry.clock_in);
        const totalMinutes = Math.round((clockOutTime.getTime() - clockInTime.getTime()) / 60000);

        const { error } = await supabase
          .from("time_entries")
          .update({
            clock_out: clockOutTime.toISOString(),
            clock_out_lat: location?.lat ?? null,
            clock_out_lng: location?.lng ?? null,
            total_minutes: totalMinutes,
            break_minutes: breakMinutes ?? 0,
            // billable_minutes computed by DB trigger
            status: "completed",
            staff_notes: notes ?? null,
          })
          .eq("id", activeEntry.id);

        if (error) throw error;

        toast.success("Clocked out!");
        queryClient.invalidateQueries({ queryKey: queryKeys.timeEntries.active(user.id) });
        queryClient.invalidateQueries({ queryKey: queryKeys.timeEntries.all() });
      } catch (err) {
        console.error("Clock out error:", err);
        toast.error("Failed to clock out");
      } finally {
        setIsClockingOut(false);
      }
    },
    [user?.id, activeEntry, queryClient],
  );

  return {
    activeEntry,
    isClockedIn,
    isClockedInToThisJob,
    isClockedInToOtherJob,
    isStaleEntry,
    elapsedSeconds,
    clockIn,
    clockOut,
    isClockingIn,
    isClockingOut,
    isLoading,
  };
}
