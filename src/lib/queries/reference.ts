import { supabase } from "@/integrations/supabase/client";

export interface ClientDropdownItem {
  id: string;
  name: string;
  address?: string | null;
}

export interface PropertyDropdownItem {
  id: string;
  name: string;
  address: string;
  client_id: string | null;
}

export interface StaffDropdownItem {
  user_id: string;
  full_name: string;
}

/** Fetch lightweight client list for dropdowns. */
export async function fetchClientsDropdown(): Promise<ClientDropdownItem[]> {
  const { data, error } = await supabase
    .from("clients")
    .select("id, name, address")
    .order("name");

  if (error) throw new Error(`Failed to load clients: ${error.message}`);
  return (data as ClientDropdownItem[]) || [];
}

/** Fetch active properties for dropdowns. */
export async function fetchPropertiesDropdown(): Promise<PropertyDropdownItem[]> {
  const { data, error } = await supabase
    .from("properties")
    .select("id, name, address, client_id")
    .eq("is_active", true)
    .order("name");

  if (error) throw new Error(`Failed to load properties: ${error.message}`);
  return (data as PropertyDropdownItem[]) || [];
}

/** Fetch staff list for dropdowns (staff-role users with profile info). */
export async function fetchStaffDropdown(): Promise<StaffDropdownItem[]> {
  const { data: staffRoles, error: rolesError } = await supabase
    .from("user_roles")
    .select("user_id")
    .eq("role", "staff");

  if (rolesError) throw new Error(`Failed to load staff roles: ${rolesError.message}`);

  const staffIds = staffRoles?.map((r) => r.user_id) || [];
  if (staffIds.length === 0) return [];

  const { data, error } = await supabase
    .from("profiles")
    .select("user_id, full_name")
    .in("user_id", staffIds);

  if (error) throw new Error(`Failed to load staff profiles: ${error.message}`);
  return (data as StaffDropdownItem[]) || [];
}
