import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { logger } from "@/lib/logger";

type JobStatus = "scheduled" | "pending" | "in_progress" | "completed" | "cancelled";

const STATUS_ORDER: JobStatus[] = ["scheduled", "pending", "in_progress", "completed"];

export function useJobStatusChange(onUpdate?: () => void) {
  const [updatingJobId, setUpdatingJobId] = useState<string | null>(null);

  const getNextStatus = (currentStatus: string): JobStatus | null => {
    const currentIndex = STATUS_ORDER.indexOf(currentStatus as JobStatus);
    if (currentIndex === -1 || currentIndex >= STATUS_ORDER.length - 1) {
      return null;
    }
    return STATUS_ORDER[currentIndex + 1];
  };

  const getPreviousStatus = (currentStatus: string): JobStatus | null => {
    const currentIndex = STATUS_ORDER.indexOf(currentStatus as JobStatus);
    if (currentIndex <= 0) {
      return null;
    }
    return STATUS_ORDER[currentIndex - 1];
  };

  const updateJobStatus = async (jobId: string, newStatus: JobStatus) => {
    setUpdatingJobId(jobId);
    
    try {
      const updateData: Record<string, unknown> = { status: newStatus };
      
      // Auto-set timestamps based on status
      if (newStatus === "in_progress") {
        updateData.start_time = new Date().toISOString();
      } else if (newStatus === "completed") {
        updateData.end_time = new Date().toISOString();
      }
      
      const { error } = await supabase
        .from("jobs")
        .update(updateData)
        .eq("id", jobId);

      if (error) throw error;

      const statusLabels: Record<string, string> = {
        scheduled: "Scheduled",
        pending: "Pending",
        in_progress: "In Progress",
        completed: "Completed",
      };

      toast.success(`Job moved to ${statusLabels[newStatus]}`);
      onUpdate?.();
    } catch (error) {
      logger.error("Error updating job status", error);
      toast.error("Failed to update job status");
    } finally {
      setUpdatingJobId(null);
    }
  };

  const advanceStatus = async (jobId: string, currentStatus: string) => {
    const nextStatus = getNextStatus(currentStatus);
    if (!nextStatus) {
      toast.info("Job is already completed");
      return;
    }
    await updateJobStatus(jobId, nextStatus);
  };

  const revertStatus = async (jobId: string, currentStatus: string) => {
    const prevStatus = getPreviousStatus(currentStatus);
    if (!prevStatus) {
      toast.info("Cannot revert further");
      return;
    }
    await updateJobStatus(jobId, prevStatus);
  };

  return {
    updatingJobId,
    updateJobStatus,
    advanceStatus,
    revertStatus,
    getNextStatus,
    getPreviousStatus,
  };
}
