import { supabase } from "@/integrations/supabase/client";
import { toRange, type PaginatedResult, type PaginationParams } from "./pagination";

export interface StaffMember {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  skills: string[];
  certifications: string[];
  hire_date: string | null;
  hourly_rate: number | null;
  is_active: boolean;
  created_at: string;
}

/** Fetch staff profiles with server-side pagination, search, and status filter. */
export async function fetchStaffPaginated(
  params: PaginationParams & { status?: "all" | "active" | "inactive" },
): Promise<PaginatedResult<StaffMember>> {
  const { page, pageSize, search, status } = params;
  const { from, to } = toRange(page, pageSize);

  // Step 1: get staff user_ids
  const { data: staffRoles, error: rolesError } = await supabase
    .from("user_roles")
    .select("user_id")
    .eq("role", "staff");

  if (rolesError) throw new Error(`Failed to load staff roles: ${rolesError.message}`);

  const staffUserIds = staffRoles.map((r) => r.user_id);
  if (staffUserIds.length === 0) return { data: [], count: 0 };

  // Step 2: paginated query on profiles filtered to staff user_ids
  let query = supabase
    .from("profiles")
    .select("*", { count: "exact", head: false })
    .in("user_id", staffUserIds)
    .order("full_name")
    .range(from, to);

  if (search) {
    query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
  }

  if (status && status !== "all") {
    query = query.eq("is_active", status === "active");
  }

  const { data, count, error } = await query;
  if (error) throw new Error(`Failed to load staff: ${error.message}`);

  const profiles = (data || []).map((p) => ({
    ...p,
    skills: Array.isArray(p.skills) ? p.skills : [],
    certifications: Array.isArray(p.certifications) ? p.certifications : [],
    is_active: p.is_active ?? true,
  }));

  return {
    data: profiles as StaffMember[],
    count: count ?? 0,
  };
}
