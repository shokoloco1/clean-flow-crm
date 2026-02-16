import { supabase } from "@/integrations/supabase/client";
import { toRange, type PaginatedResult, type PaginationParams } from "./pagination";

export interface RecurringScheduleRecord {
  id: string;
  client_id: string | null;
  property_id: string | null;
  assigned_staff_id: string | null;
  location: string;
  scheduled_time: string;
  notes: string | null;
  checklist: string[];
  frequency: "daily" | "weekly" | "biweekly" | "monthly";
  days_of_week: number[];
  day_of_month: number | null;
  is_active: boolean;
  last_generated_date: string | null;
  next_generation_date: string | null;
  created_at: string;
  clients: { name: string } | null;
  properties: { name: string } | null;
  profiles: { full_name: string } | null;
}

/** Fetch all recurring schedules with client/property joins and resolved staff names. */
export async function fetchRecurringSchedules(): Promise<RecurringScheduleRecord[]> {
  const { data: schedulesData, error } = await supabase
    .from("recurring_schedules")
    .select(`*, clients (name), properties (name)`)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) throw new Error(`Failed to load schedules: ${error.message}`);

  // Resolve staff names via profiles
  const staffIds = new Set<string>();
  (schedulesData || []).forEach((s: Record<string, unknown>) => {
    if (s.assigned_staff_id) staffIds.add(s.assigned_staff_id as string);
  });

  let staffMap: Record<string, string> = {};
  if (staffIds.size > 0) {
    const { data: staffData } = await supabase
      .from("profiles")
      .select("user_id, full_name")
      .in("user_id", Array.from(staffIds));
    staffMap = Object.fromEntries((staffData || []).map((s) => [s.user_id, s.full_name]));
  }

  return (schedulesData || []).map((schedule: Record<string, unknown>) => ({
    ...schedule,
    profiles: schedule.assigned_staff_id
      ? { full_name: staffMap[schedule.assigned_staff_id as string] || "Unassigned" }
      : null,
  })) as RecurringScheduleRecord[];
}

/** Fetch recurring schedules with server-side pagination and search. */
export async function fetchRecurringSchedulesPaginated(
  params: PaginationParams,
): Promise<PaginatedResult<RecurringScheduleRecord>> {
  const { page, pageSize, search } = params;
  const { from, to } = toRange(page, pageSize);

  let query = supabase
    .from("recurring_schedules")
    .select(`*, clients (name), properties (name)`, { count: "exact", head: false })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (search) {
    query = query.ilike("location", `%${search}%`);
  }

  const { data: schedulesData, count, error } = await query;

  if (error) throw new Error(`Failed to load schedules: ${error.message}`);

  // Resolve staff names via profiles
  const staffIds = new Set<string>();
  (schedulesData || []).forEach((s: Record<string, unknown>) => {
    if (s.assigned_staff_id) staffIds.add(s.assigned_staff_id as string);
  });

  let staffMap: Record<string, string> = {};
  if (staffIds.size > 0) {
    const { data: staffData } = await supabase
      .from("profiles")
      .select("user_id, full_name")
      .in("user_id", Array.from(staffIds));
    staffMap = Object.fromEntries((staffData || []).map((s) => [s.user_id, s.full_name]));
  }

  const data = (schedulesData || []).map((schedule: Record<string, unknown>) => ({
    ...schedule,
    profiles: schedule.assigned_staff_id
      ? { full_name: staffMap[schedule.assigned_staff_id as string] || "Unassigned" }
      : null,
  })) as RecurringScheduleRecord[];

  return {
    data,
    count: count ?? 0,
  };
}
