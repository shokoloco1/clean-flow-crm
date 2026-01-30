import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, addDays } from "date-fns";

interface DuplicateJobOptions {
  jobId: string;
  daysOffset?: number; // How many days from today (default: 1)
  keepTime?: boolean;  // Keep original time (default: true)
  keepStaff?: boolean; // Keep same staff (default: true)
}

export function useDuplicateJob(onSuccess?: () => void) {
  const [isDuplicating, setIsDuplicating] = useState(false);

  const duplicateJob = async ({ 
    jobId, 
    daysOffset = 1, 
    keepTime = true, 
    keepStaff = true 
  }: DuplicateJobOptions) => {
    setIsDuplicating(true);
    
    try {
      // Fetch the original job
      const { data: originalJob, error: fetchError } = await supabase
        .from("jobs")
        .select("*")
        .eq("id", jobId)
        .single();

      if (fetchError || !originalJob) {
        throw new Error("Could not find original job");
      }

      // Calculate new date
      const newDate = format(addDays(new Date(), daysOffset), 'yyyy-MM-dd');
      
      // Create the duplicate
      const { data: newJob, error: insertError } = await supabase
        .from("jobs")
        .insert({
          client_id: originalJob.client_id,
          property_id: originalJob.property_id,
          location: originalJob.location,
          assigned_staff_id: keepStaff ? originalJob.assigned_staff_id : null,
          scheduled_date: newDate,
          scheduled_time: keepTime ? originalJob.scheduled_time : '09:00',
          notes: originalJob.notes,
          checklist: originalJob.checklist,
          status: 'scheduled',
        })
        .select()
        .single();

      if (insertError) throw insertError;

      toast.success("Job duplicated!", {
        description: `Scheduled for ${format(new Date(newDate), 'EEEE, MMM d')}`,
      });
      
      onSuccess?.();
      return newJob;
    } catch (error) {
      console.error("Error duplicating job:", error);
      toast.error("Failed to duplicate job");
      return null;
    } finally {
      setIsDuplicating(false);
    }
  };

  return { duplicateJob, isDuplicating };
}
