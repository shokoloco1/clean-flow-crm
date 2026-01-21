-- Fix SECURITY DEFINER views by using SECURITY INVOKER instead
-- This ensures RLS policies of the querying user are applied

-- Drop and recreate properties_safe view with SECURITY INVOKER
DROP VIEW IF EXISTS public.properties_safe;
CREATE VIEW public.properties_safe 
WITH (security_invoker = true)
AS
SELECT 
  id,
  client_id,
  name,
  address,
  property_type,
  size_sqm,
  location_lat,
  location_lng,
  geofence_radius_meters,
  special_instructions,
  default_checklist_template_id,
  is_active,
  created_at,
  updated_at
FROM public.properties;

GRANT SELECT ON public.properties_safe TO authenticated;

-- Drop and recreate clients_safe view with SECURITY INVOKER
DROP VIEW IF EXISTS public.clients_safe;
CREATE VIEW public.clients_safe 
WITH (security_invoker = true)
AS
SELECT 
  id,
  name,
  email,
  phone,
  address,
  notes,
  access_codes,
  created_at,
  updated_at
FROM public.clients;

GRANT SELECT ON public.clients_safe TO authenticated;