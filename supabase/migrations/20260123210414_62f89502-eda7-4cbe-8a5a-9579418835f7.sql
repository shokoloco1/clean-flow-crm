-- Enable RLS on safe views and require authentication

-- Properties Safe View - require authentication
ALTER VIEW public.properties_safe SET (security_invoker = true);

DROP POLICY IF EXISTS "Authenticated users can view properties_safe" ON public.properties_safe;

-- Note: Views in Supabase inherit RLS from their base tables when security_invoker is set
-- But we need to ensure the view itself requires auth

-- For views, we use security_barrier and create policies on the underlying table
-- Since properties already has RLS, the view should respect it

-- Alternative: Create RLS-enabled wrapper using a function
-- Let's drop the views and recreate them as security definer functions instead

-- Drop existing views
DROP VIEW IF EXISTS public.properties_safe;
DROP VIEW IF EXISTS public.profiles_safe;
DROP VIEW IF EXISTS public.clients_safe;

-- Recreate properties_safe as a secure function
CREATE OR REPLACE FUNCTION public.get_properties_safe()
RETURNS TABLE (
  id uuid,
  name text,
  address text,
  property_type text,
  size_sqm double precision,
  location_lat double precision,
  location_lng double precision,
  geofence_radius_meters integer,
  special_instructions text,
  default_checklist_template_id uuid,
  client_id uuid,
  is_active boolean,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.id,
    p.name,
    p.address,
    p.property_type,
    p.size_sqm,
    p.location_lat,
    p.location_lng,
    p.geofence_radius_meters,
    p.special_instructions,
    p.default_checklist_template_id,
    p.client_id,
    p.is_active,
    p.created_at,
    p.updated_at
  FROM public.properties p
  WHERE 
    -- Admin can see all
    has_role(auth.uid(), 'admin'::app_role)
    OR 
    -- Staff can only see properties they're assigned to
    (has_role(auth.uid(), 'staff'::app_role) AND is_staff_assigned_to_property(p.id, auth.uid()))
$$;

-- Recreate profiles_safe as a secure function  
CREATE OR REPLACE FUNCTION public.get_profiles_safe()
RETURNS TABLE (
  id uuid,
  user_id uuid,
  full_name text,
  email text,
  phone text,
  skills jsonb,
  certifications jsonb,
  hire_date date,
  is_active boolean,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.id,
    p.user_id,
    p.full_name,
    p.email,
    p.phone,
    p.skills,
    p.certifications,
    p.hire_date,
    p.is_active,
    p.created_at,
    p.updated_at
  FROM public.profiles p
  WHERE 
    -- Admin can see all profiles
    has_role(auth.uid(), 'admin'::app_role)
    OR 
    -- Users can see their own profile
    auth.uid() = p.user_id
$$;

-- Recreate clients_safe as a secure function
CREATE OR REPLACE FUNCTION public.get_clients_safe()
RETURNS TABLE (
  id uuid,
  name text,
  email text,
  phone text,
  address text,
  notes text,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    c.id,
    c.name,
    c.email,
    c.phone,
    c.address,
    c.notes,
    c.created_at,
    c.updated_at
  FROM public.clients c
  WHERE 
    -- Only admins can see client data
    has_role(auth.uid(), 'admin'::app_role)
$$;

-- Grant execute permissions to authenticated users only
GRANT EXECUTE ON FUNCTION public.get_properties_safe() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_profiles_safe() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_clients_safe() TO authenticated;

-- Revoke from anon/public
REVOKE EXECUTE ON FUNCTION public.get_properties_safe() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_profiles_safe() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_clients_safe() FROM anon, public;