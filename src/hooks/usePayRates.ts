import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { queryKeys } from "@/lib/queries/keys";
import { toast } from "sonner";
import type { StaffPayRate } from "@/types/time-tracking";

interface StaffWithRate {
  user_id: string;
  full_name: string;
  email: string;
  is_active: boolean | null;
  hourly_rate: number | null; // from profiles table (fallback)
  pay_rate: StaffPayRate | null; // from staff_pay_rates table (primary)
  effectiveRate: number; // resolved rate
}

const DEFAULT_RATE = 30; // AUD/hr fallback

export function usePayRates() {
  const { user, role } = useAuth();
  const queryClient = useQueryClient();

  // Fetch all staff with their pay rates (admin) or own rate (staff)
  const { data: staffWithRates = [], isLoading } = useQuery({
    queryKey: queryKeys.payRates.all(),
    queryFn: async () => {
      // Get all staff profiles
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, full_name, email, is_active, hourly_rate")
        .order("full_name");

      if (profilesError) throw profilesError;

      // Get current pay rates (where effective_to IS NULL or >= today)
      const today = new Date().toISOString().split("T")[0];
      const { data: rates, error: ratesError } = await supabase
        .from("staff_pay_rates")
        .select("*")
        .or(`effective_to.is.null,effective_to.gte.${today}`)
        .order("effective_from", { ascending: false });

      if (ratesError) throw ratesError;

      const rateMap = new Map<string, StaffPayRate>();
      for (const rate of (rates ?? []) as StaffPayRate[]) {
        // Take the most recent rate per staff
        if (!rateMap.has(rate.staff_id)) {
          rateMap.set(rate.staff_id, rate);
        }
      }

      return (profiles ?? []).map((p) => {
        const payRate = rateMap.get(p.user_id) ?? null;
        return {
          user_id: p.user_id,
          full_name: p.full_name,
          email: p.email,
          is_active: p.is_active,
          hourly_rate: p.hourly_rate,
          pay_rate: payRate,
          effectiveRate: payRate?.hourly_rate ?? p.hourly_rate ?? DEFAULT_RATE,
        } satisfies StaffWithRate;
      });
    },
    enabled: !!user?.id && role === "admin",
  });

  // Get effective rate for a specific staff member
  const getStaffRate = (staffId: string): number => {
    const staff = staffWithRates.find((s) => s.user_id === staffId);
    return staff?.effectiveRate ?? DEFAULT_RATE;
  };

  // Admin: set a new rate for a staff member
  const setRate = async (staffId: string, hourlyRate: number, overtimeRate?: number) => {
    if (role !== "admin") {
      toast.error("Only admins can set pay rates");
      return;
    }

    try {
      // Close the current active rate (set effective_to = today)
      const today = new Date().toISOString().split("T")[0];
      await supabase
        .from("staff_pay_rates")
        .update({ effective_to: today, updated_at: new Date().toISOString() })
        .eq("staff_id", staffId)
        .is("effective_to", null);

      // Insert new rate
      const { error } = await supabase.from("staff_pay_rates").insert({
        staff_id: staffId,
        hourly_rate: hourlyRate,
        overtime_rate: overtimeRate ?? null,
        effective_from: today,
        created_by: user!.id,
      });

      if (error) throw error;

      toast.success("Pay rate updated");
      queryClient.invalidateQueries({ queryKey: queryKeys.payRates.all() });
    } catch (err) {
      console.error("Set rate error:", err);
      toast.error("Failed to update pay rate");
    }
  };

  return {
    staffWithRates,
    isLoading,
    getStaffRate,
    setRate,
  };
}
