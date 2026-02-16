import { supabase } from "@/integrations/supabase/client";
import { toRange, type PaginatedResult, type PaginationParams } from "./pagination";

export interface Invoice {
  id: string;
  invoice_number: string;
  client_id: string;
  status: string;
  issue_date: string;
  due_date: string;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
  notes: string | null;
  created_at: string;
  clients?: {
    name: string;
    address?: string;
    email?: string;
    phone?: string;
    abn?: string;
  } | null;
}

/** Fetch all invoices with client joins, ordered by most recent. */
export async function fetchInvoices(): Promise<Invoice[]> {
  const { data, error } = await supabase
    .from("invoices")
    .select(`*, clients (name, email, abn, address)`)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) throw new Error(`Failed to load invoices: ${error.message}`);

  return (data as Invoice[]) || [];
}

/** Fetch invoices with server-side pagination, search, and optional status filter. */
export async function fetchInvoicesPaginated(
  params: PaginationParams & { status?: string },
): Promise<PaginatedResult<Invoice>> {
  const { page, pageSize, search, status } = params;
  const { from, to } = toRange(page, pageSize);

  let query = supabase
    .from("invoices")
    .select(`*, clients (name, email, abn, address)`, { count: "exact", head: false })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (search) {
    query = query.or(`invoice_number.ilike.%${search}%,clients.name.ilike.%${search}%`);
  }

  if (status && status !== "all") {
    query = query.eq("status", status);
  }

  const { data, count, error } = await query;

  if (error) throw new Error(`Failed to load invoices: ${error.message}`);

  return {
    data: (data as Invoice[]) || [],
    count: count ?? 0,
  };
}
