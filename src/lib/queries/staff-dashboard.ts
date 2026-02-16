import { supabase } from "@/integrations/supabase/client";
import { format, addDays } from "date-fns";

export interface StaffProperty {
  id: string;
  name: string;
  address: string;
  bedrooms: number | null;
  bathrooms: number | null;
  living_areas: number | null;
  floors: number | null;
  floor_type: string | null;
  has_pets: boolean | null;
  pet_details: string | null;
  has_pool: boolean | null;
  has_garage: boolean | null;
  special_instructions: string | null;
  access_codes: string | null;
  estimated_hours: number | null;
  google_maps_link: string | null;
  suburb: string | null;
  post_code: string | null;
  state: string | null;
  sofas: number | null;
  beds: number | null;
  dining_chairs: number | null;
  rugs: number | null;
}

export interface StaffJob {
  id: string;
  location: string;
  scheduled_date: string;
  scheduled_time: string;
  status: string;
  checklist: string[];
  start_time: string | null;
  end_time: string | null;
  notes: string | null;
  property_id: string | null;
  clients: { name: string } | null;
  properties: StaffProperty | null;
}

export interface ChecklistProgress {
  completed: number;
  total: number;
}

/** Fetch jobs assigned to a specific user for today + 7 days with property details. */
export async function fetchMyJobs(userId: string): Promise<StaffJob[]> {
  const today = format(new Date(), "yyyy-MM-dd");
  const nextWeek = format(addDays(new Date(), 7), "yyyy-MM-dd");

  const { data } = await supabase
    .from("jobs")
    .select(
      `
      id,
      location,
      scheduled_date,
      scheduled_time,
      status,
      checklist,
      start_time,
      end_time,
      notes,
      property_id,
      clients (name),
      properties (
        id,
        name,
        address,
        bedrooms,
        bathrooms,
        living_areas,
        floors,
        floor_type,
        has_pets,
        pet_details,
        has_pool,
        has_garage,
        special_instructions,
        access_codes,
        estimated_hours,
        google_maps_link,
        suburb,
        post_code,
        state
      )
    `,
    )
    .eq("assigned_staff_id", userId)
    .gte("scheduled_date", today)
    .lte("scheduled_date", nextWeek)
    .order("scheduled_date", { ascending: true })
    .order("scheduled_time", { ascending: true });

  return (data as unknown as StaffJob[]) || [];
}

/** Fetch checklist progress for a list of job IDs. */
export async function fetchChecklistProgress(
  jobIds: string[],
): Promise<Record<string, ChecklistProgress>> {
  if (jobIds.length === 0) return {};

  const { data: checklistItems } = await supabase
    .from("checklist_items")
    .select("job_id, completed_at")
    .in("job_id", jobIds);

  const progressMap: Record<string, ChecklistProgress> = {};

  if (checklistItems) {
    checklistItems.forEach((item: { job_id: string; completed_at: string | null }) => {
      if (!progressMap[item.job_id]) {
        progressMap[item.job_id] = { completed: 0, total: 0 };
      }
      progressMap[item.job_id].total++;
      if (item.completed_at) {
        progressMap[item.job_id].completed++;
      }
    });
  }

  return progressMap;
}
