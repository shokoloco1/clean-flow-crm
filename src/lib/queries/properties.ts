import { supabase } from "@/integrations/supabase/client";
import { toRange, type PaginatedResult, type PaginationParams } from "./pagination";

export interface PropertyRecord {
  id: string;
  name: string;
  address: string;
  location_lat: number | null;
  location_lng: number | null;
  size_sqm: number | null;
  property_type: string;
  special_instructions: string | null;
  access_codes: string | null;
  geofence_radius_meters: number;
  is_active: boolean;
  client_id: string | null;
  clients: { name: string } | null;
  bedrooms?: number;
  bathrooms?: number;
  living_areas?: number;
  floors?: number;
  floor_type?: string;
  has_pool?: boolean;
  has_garage?: boolean;
  has_pets?: boolean;
  pet_details?: string;
  sofas?: number;
  dining_chairs?: number;
  beds?: number;
  rugs?: number;
  estimated_hours?: number;
}

export interface PropertyPhoto {
  id: string;
  photo_url: string;
  room_area: string | null;
  description: string | null;
}

/** Fetch all properties with client names. */
export async function fetchProperties(): Promise<PropertyRecord[]> {
  const { data, error } = await supabase
    .from("properties")
    .select(`*, clients (name)`)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) throw new Error(`Failed to load properties: ${error.message}`);

  return (data as unknown as PropertyRecord[]) || [];
}

/** Fetch properties with server-side pagination and search. */
export async function fetchPropertiesPaginated(
  params: PaginationParams,
): Promise<PaginatedResult<PropertyRecord>> {
  const { page, pageSize, search } = params;
  const { from, to } = toRange(page, pageSize);

  let query = supabase
    .from("properties")
    .select(`*, clients (name)`, { count: "exact", head: false })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (search) {
    query = query.or(`name.ilike.%${search}%,address.ilike.%${search}%`);
  }

  const { data, count, error } = await query;

  if (error) throw new Error(`Failed to load properties: ${error.message}`);

  return {
    data: (data as unknown as PropertyRecord[]) || [],
    count: count ?? 0,
  };
}

/** Fetch photos for a specific property. */
export async function fetchPropertyPhotos(propertyId: string): Promise<PropertyPhoto[]> {
  const { data, error } = await supabase
    .from("property_photos")
    .select("*")
    .eq("property_id", propertyId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Failed to load photos: ${error.message}`);

  return (data as PropertyPhoto[]) || [];
}
