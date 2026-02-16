import { supabase } from "@/integrations/supabase/client";
import { toRange, type PaginatedResult, type PaginationParams } from "./pagination";

export interface Client {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  abn: string | null;
  notes: string | null;
  portal_token: string | null;
  created_at: string;
  updated_at: string;
}

/** Fetch clients with server-side pagination and search. */
export async function fetchClientsPaginated(
  params: PaginationParams,
): Promise<PaginatedResult<Client>> {
  const { page, pageSize, search } = params;
  const { from, to } = toRange(page, pageSize);

  let query = supabase
    .from("clients")
    .select("*", { count: "exact", head: false })
    .order("name")
    .range(from, to);

  if (search) {
    query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,abn.ilike.%${search}%`);
  }

  const { data, count, error } = await query;

  if (error) throw new Error(`Failed to load clients: ${error.message}`);

  return {
    data: (data as Client[]) || [],
    count: count ?? 0,
  };
}
