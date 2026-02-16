import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";
import { logger } from "@/lib/logger";

export interface StaffAvailability {
  id: string;
  user_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_available: boolean;
}

const DEFAULT_AVAILABILITY: Omit<StaffAvailability, "id" | "user_id">[] = [
  { day_of_week: 0, start_time: "09:00", end_time: "17:00", is_available: false }, // Sunday
  { day_of_week: 1, start_time: "09:00", end_time: "17:00", is_available: true }, // Monday
  { day_of_week: 2, start_time: "09:00", end_time: "17:00", is_available: true }, // Tuesday
  { day_of_week: 3, start_time: "09:00", end_time: "17:00", is_available: true }, // Wednesday
  { day_of_week: 4, start_time: "09:00", end_time: "17:00", is_available: true }, // Thursday
  { day_of_week: 5, start_time: "09:00", end_time: "17:00", is_available: true }, // Friday
  { day_of_week: 6, start_time: "09:00", end_time: "17:00", is_available: false }, // Saturday
];

export function useStaffAvailability(staffId?: string) {
  const { user } = useAuth();
  const targetUserId = staffId || user?.id;

  const [availability, setAvailability] = useState<StaffAvailability[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchAvailability = useCallback(async () => {
    if (!targetUserId) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("staff_availability")
        .select("*")
        .eq("user_id", targetUserId)
        .order("day_of_week");

      if (error) throw error;

      if (data && data.length > 0) {
        setAvailability(data);
      } else {
        // Initialize with defaults if no availability set
        const defaults = DEFAULT_AVAILABILITY.map((d, i) => ({
          ...d,
          id: `temp-${i}`,
          user_id: targetUserId,
        }));
        setAvailability(defaults as StaffAvailability[]);
      }
    } catch (error) {
      logger.error("Error fetching availability:", error);
    } finally {
      setLoading(false);
    }
  }, [targetUserId]);

  useEffect(() => {
    fetchAvailability();
  }, [fetchAvailability]);

  const toggleDay = useCallback((dayOfWeek: number) => {
    setAvailability((prev) =>
      prev.map((a) => (a.day_of_week === dayOfWeek ? { ...a, is_available: !a.is_available } : a)),
    );
  }, []);

  const updateHours = useCallback((dayOfWeek: number, startTime: string, endTime: string) => {
    setAvailability((prev) =>
      prev.map((a) =>
        a.day_of_week === dayOfWeek ? { ...a, start_time: startTime, end_time: endTime } : a,
      ),
    );
  }, []);

  const saveAvailability = useCallback(async () => {
    if (!targetUserId) return;

    setSaving(true);
    try {
      // Use upsert to safely update or insert availability records
      // This prevents data loss if insert fails after delete
      const toUpsert = availability.map(({ day_of_week, start_time, end_time, is_available }) => ({
        user_id: targetUserId,
        day_of_week,
        start_time,
        end_time,
        is_available,
      }));

      const { error } = await supabase.from("staff_availability").upsert(toUpsert, {
        onConflict: "user_id,day_of_week",
        ignoreDuplicates: false,
      });

      if (error) throw error;

      toast.success("Availability saved");
      fetchAvailability();
    } catch (error) {
      logger.error("Error saving availability:", error);
      toast.error("Failed to save availability");
    } finally {
      setSaving(false);
    }
  }, [targetUserId, availability, fetchAvailability]);

  return {
    availability,
    loading,
    saving,
    toggleDay,
    updateHours,
    saveAvailability,
    refetch: fetchAvailability,
  };
}

// Hook to get available staff for a specific date and time
export function useAvailableStaff(date: string, time: string) {
  const [availableStaff, setAvailableStaff] = useState<
    { user_id: string; full_name: string; hasConflict: boolean }[]
  >([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!date || !time) {
      setAvailableStaff([]);
      return;
    }

    const fetchAvailableStaff = async () => {
      setLoading(true);
      try {
        const scheduledDate = new Date(date);
        const dayOfWeek = scheduledDate.getDay();

        // Get all staff with their availability
        const { data: staffRoles } = await supabase
          .from("user_roles")
          .select("user_id")
          .eq("role", "staff");

        const staffIds = staffRoles?.map((r) => r.user_id) || [];

        if (staffIds.length === 0) {
          setAvailableStaff([]);
          setLoading(false);
          return;
        }

        // Get staff profiles
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", staffIds)
          .eq("is_active", true);

        // Get availability for this day
        const { data: availabilityData } = await supabase
          .from("staff_availability")
          .select("user_id, start_time, end_time, is_available")
          .in("user_id", staffIds)
          .eq("day_of_week", dayOfWeek);

        // Get existing jobs for this date to check for conflicts
        const { data: existingJobs } = await supabase
          .from("jobs")
          .select("assigned_staff_id, scheduled_time")
          .eq("scheduled_date", date)
          .in("status", ["pending", "in_progress"]);

        const availabilityMap = new Map(availabilityData?.map((a) => [a.user_id, a]) || []);

        const jobsMap = new Map<string, string[]>();
        existingJobs?.forEach((j) => {
          if (j.assigned_staff_id) {
            const times = jobsMap.get(j.assigned_staff_id) || [];
            times.push(j.scheduled_time);
            jobsMap.set(j.assigned_staff_id, times);
          }
        });

        const result = (profiles || []).map((p) => {
          const avail = availabilityMap.get(p.user_id);
          const existingTimes = jobsMap.get(p.user_id) || [];

          // Check if staff is available on this day
          const isAvailableOnDay = avail?.is_available !== false;

          // Check time conflicts (same hour = conflict)
          const scheduledHour = time.split(":")[0];
          const hasTimeConflict = existingTimes.some((t) => t.split(":")[0] === scheduledHour);

          // Check if within working hours
          let withinHours = true;
          if (avail && avail.is_available) {
            withinHours = time >= avail.start_time && time <= avail.end_time;
          }

          return {
            user_id: p.user_id,
            full_name: p.full_name,
            hasConflict: !isAvailableOnDay || hasTimeConflict || !withinHours,
          };
        });

        // Sort: available staff first
        result.sort((a, b) => {
          if (a.hasConflict === b.hasConflict) return a.full_name.localeCompare(b.full_name);
          return a.hasConflict ? 1 : -1;
        });

        setAvailableStaff(result);
      } catch (error) {
        logger.error("Error fetching available staff:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAvailableStaff();
  }, [date, time]);

  return { availableStaff, loading };
}
