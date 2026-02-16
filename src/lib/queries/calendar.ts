import { supabase } from "@/integrations/supabase/client";

export interface CalendarJob {
  id: string;
  location: string;
  scheduled_date: string;
  scheduled_time: string;
  status: string;
  notes: string | null;
  client_id: string | null;
  assigned_staff_id: string | null;
  clients: { name: string } | null;
  profiles: { full_name: string } | null;
}

/** Fetch all jobs for the calendar with client joins and resolved staff names. */
export async function fetchCalendarJobs(): Promise<CalendarJob[]> {
  const { data: jobsData, error: jobsError } = await supabase
    .from("jobs")
    .select(
      `
      id,
      location,
      scheduled_date,
      scheduled_time,
      status,
      notes,
      client_id,
      assigned_staff_id,
      clients (name)
    `,
    )
    .order("scheduled_date", { ascending: true })
    .limit(500);

  if (jobsError) throw new Error(`Failed to load jobs: ${jobsError.message}`);

  const staffIds = [
    ...new Set(
      (jobsData || [])
        .map((j) => j.assigned_staff_id)
        .filter((id): id is string => id !== null),
    ),
  ];

  let staffMap: Record<string, string> = {};
  if (staffIds.length > 0) {
    const { data: profilesData } = await supabase
      .from("profiles")
      .select("user_id, full_name")
      .in("user_id", staffIds);

    staffMap = (profilesData || []).reduce(
      (acc, p) => {
        acc[p.user_id] = p.full_name;
        return acc;
      },
      {} as Record<string, string>,
    );
  }

  return (jobsData || []).map((job) => ({
    ...job,
    profiles:
      job.assigned_staff_id && staffMap[job.assigned_staff_id]
        ? { full_name: staffMap[job.assigned_staff_id] }
        : null,
  })) as CalendarJob[];
}
