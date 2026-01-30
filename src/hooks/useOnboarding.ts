import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useOnboarding() {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkOnboardingStatus();
  }, []);

  const checkOnboardingStatus = async () => {
    try {
      // Check if onboarding was already completed
      const { data: onboardingSetting } = await supabase
        .from("system_settings")
        .select("value")
        .eq("key", "onboarding_completed")
        .single();

      if (onboardingSetting?.value === true) {
        setShowOnboarding(false);
        setIsLoading(false);
        return;
      }

      // Check if there's any existing data (clients, jobs, staff)
      const [clientsResult, jobsResult] = await Promise.all([
        supabase.from("clients").select("id", { count: "exact", head: true }),
        supabase.from("jobs").select("id", { count: "exact", head: true }),
      ]);

      const hasClients = (clientsResult.count || 0) > 0;
      const hasJobs = (jobsResult.count || 0) > 0;

      // Show onboarding only if no data exists
      setShowOnboarding(!hasClients && !hasJobs);
    } catch (err) {
      console.error("Error checking onboarding status:", err);
      setShowOnboarding(false);
    } finally {
      setIsLoading(false);
    }
  };

  const completeOnboarding = async () => {
    try {
      await supabase.from("system_settings").upsert({
        key: "onboarding_completed",
        value: true,
        description: "Whether the onboarding wizard has been completed",
      }, { onConflict: "key" });
      
      setShowOnboarding(false);
    } catch (err) {
      console.error("Error completing onboarding:", err);
    }
  };

  const skipOnboarding = () => {
    completeOnboarding();
  };

  return {
    showOnboarding,
    isLoading,
    completeOnboarding,
    skipOnboarding,
  };
}
