import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface JobPhoto {
  id: string;
  job_id: string;
  photo_url: string;
  photo_type: "before" | "after";
  created_at: string;
}

export interface JobForDetail {
  id: string;
  location: string;
  scheduled_date: string;
  scheduled_time: string;
  status: string;
  start_time: string | null;
  end_time: string | null;
  notes: string | null;
  clients: { name: string } | null;
  profiles: { full_name: string } | null;
}

export function useJobDetail() {
  const [selectedJob, setSelectedJob] = useState<JobForDetail | null>(null);
  const [jobPhotos, setJobPhotos] = useState<JobPhoto[]>([]);

  const handleViewJob = async (job: JobForDetail) => {
    setSelectedJob(job);

    const { data } = await supabase
      .from("job_photos")
      .select("*")
      .eq("job_id", job.id)
      .order("created_at", { ascending: true });

    setJobPhotos((data as JobPhoto[]) || []);
  };

  const closeJobDetail = () => {
    setSelectedJob(null);
    setJobPhotos([]);
  };

  return {
    selectedJob,
    jobPhotos,
    handleViewJob,
    closeJobDetail,
  };
}
