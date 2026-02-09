import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/useLanguage";

interface GpsLocation {
  lat: number;
  lng: number;
}

export function useJobWorkflow(jobId: string) {
  const { toast } = useToast();
  const { t } = useLanguage();
  const [isStarting, setIsStarting] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);

  const captureGps = useCallback(async (): Promise<GpsLocation | null> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        toast({
          title: t("error"),
          description: t("gps_not_available"),
          variant: "destructive",
        });
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
        (error) => {
          console.warn("GPS capture failed:", error);
          // Don't block the workflow if GPS fails
          resolve(null);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    });
  }, [toast, t]);

  const startJob = useCallback(async (): Promise<boolean> => {
    setIsStarting(true);
    try {
      // Capture GPS location
      const location = await captureGps();

      // Update job status
      const updateData: Record<string, unknown> = {
        status: "in_progress",
        start_time: new Date().toISOString(),
      };

      if (location) {
        updateData.checkin_lat = location.lat;
        updateData.checkin_lng = location.lng;
      }

      const { error } = await supabase
        .from("jobs")
        .update(updateData)
        .eq("id", jobId);

      if (error) {
        throw error;
      }

      toast({
        title: t("success"),
        description: t("job_started"),
      });

      return true;
    } catch (error) {
      console.error("Error starting job:", error);
      toast({
        title: t("error"),
        description: t("error_starting"),
        variant: "destructive",
      });
      return false;
    } finally {
      setIsStarting(false);
    }
  }, [jobId, captureGps, toast, t]);

  const completeJob = useCallback(
    async (staffNotes?: string, issueReported?: string): Promise<boolean> => {
      setIsCompleting(true);
      try {
        // First get the job to calculate duration
        const { data: job, error: fetchError } = await supabase
          .from("jobs")
          .select("start_time")
          .eq("id", jobId)
          .single();

        if (fetchError || !job?.start_time) {
          throw new Error("Could not fetch job start time");
        }

        // Capture GPS location
        const location = await captureGps();

        // Calculate duration in minutes
        const startTime = new Date(job.start_time);
        const endTime = new Date();
        const durationMinutes = Math.round(
          (endTime.getTime() - startTime.getTime()) / 60000
        );

        // Update job
        const updateData: Record<string, unknown> = {
          status: "completed",
          end_time: endTime.toISOString(),
          actual_duration_minutes: durationMinutes,
        };

        if (location) {
          updateData.checkout_lat = location.lat;
          updateData.checkout_lng = location.lng;
        }

        if (staffNotes) {
          updateData.staff_notes = staffNotes;
        }

        if (issueReported) {
          updateData.issue_reported = issueReported;
        }

        const { error } = await supabase
          .from("jobs")
          .update(updateData)
          .eq("id", jobId);

        if (error) {
          throw error;
        }

        toast({
          title: t("success"),
          description: t("job_completed"),
        });

        return true;
      } catch (error) {
        console.error("Error completing job:", error);
        toast({
          title: t("error"),
          description: t("error_completing"),
          variant: "destructive",
        });
        return false;
      } finally {
        setIsCompleting(false);
      }
    },
    [jobId, captureGps, toast, t]
  );

  return {
    startJob,
    completeJob,
    captureGps,
    isStarting,
    isCompleting,
  };
}
