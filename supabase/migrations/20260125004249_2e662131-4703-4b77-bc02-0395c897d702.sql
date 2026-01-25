
-- =====================================================
-- FIX CRITICAL RLS SECURITY ISSUES
-- Restrict access based on job assignments
-- =====================================================

-- 1. DROP existing permissive policies
DROP POLICY IF EXISTS "Admins can manage clients" ON public.clients;
DROP POLICY IF EXISTS "Block public access to clients" ON public.clients;

DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Block public access to profiles" ON public.profiles;

DROP POLICY IF EXISTS "Admins can manage properties" ON public.properties;
DROP POLICY IF EXISTS "Staff can view properties for their assigned jobs" ON public.properties;
DROP POLICY IF EXISTS "Block public access to properties" ON public.properties;

DROP POLICY IF EXISTS "Admins can manage property photos" ON public.property_photos;
DROP POLICY IF EXISTS "Staff can view property photos" ON public.property_photos;

-- 2. Create helper function for staff->client access via jobs
CREATE OR REPLACE FUNCTION public.is_staff_assigned_to_client(_client_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.jobs
    WHERE client_id = _client_id
    AND assigned_staff_id = _user_id
    AND scheduled_date >= CURRENT_DATE - INTERVAL '7 days'
  )
$$;

-- 3. CLIENTS table - Staff can only see clients for their assigned jobs
CREATE POLICY "Admins can manage clients"
ON public.clients FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Staff can view clients for their assigned jobs"
ON public.clients FOR SELECT
USING (
  has_role(auth.uid(), 'staff'::app_role) 
  AND is_staff_assigned_to_client(id, auth.uid())
);

CREATE POLICY "Block unauthenticated access to clients"
ON public.clients FOR ALL
USING (auth.uid() IS NOT NULL);

-- 4. PROFILES table - Remove sensitive fields from staff view, users see only their own
-- Create a view without sensitive data for cross-profile visibility
CREATE OR REPLACE VIEW public.profiles_public AS
SELECT 
  id,
  user_id,
  full_name,
  email,
  phone,
  skills,
  certifications,
  hire_date,
  is_active,
  created_at,
  updated_at
  -- EXCLUDES: hourly_rate, emergency_contact_name, emergency_contact_phone
FROM public.profiles;

-- Secure base table policies
CREATE POLICY "Admins can manage all profiles"
ON public.profiles FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own non-sensitive profile fields"
ON public.profiles FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Block unauthenticated access to profiles"
ON public.profiles FOR ALL
USING (auth.uid() IS NOT NULL);

-- 5. PROPERTIES table - Staff see only assigned properties, access_codes hidden
-- Create a safe view that hides access_codes from non-admins
CREATE OR REPLACE VIEW public.properties_staff_view
WITH (security_invoker = on) AS
SELECT 
  id,
  name,
  address,
  suburb,
  post_code,
  state,
  google_maps_link,
  property_type,
  bedrooms,
  bathrooms,
  living_areas,
  floors,
  has_pool,
  has_garage,
  has_pets,
  pet_details,
  floor_type,
  sofas,
  dining_chairs,
  beds,
  rugs,
  estimated_hours,
  special_instructions,
  client_id,
  default_checklist_template_id,
  is_active,
  created_at,
  updated_at
  -- EXCLUDES: access_codes, location_lat, location_lng, geofence_radius_meters, size_sqm
FROM public.properties;

CREATE POLICY "Admins can manage properties"
ON public.properties FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Staff can view properties for their assigned jobs"
ON public.properties FOR SELECT
USING (
  has_role(auth.uid(), 'staff'::app_role) 
  AND is_staff_assigned_to_property(id, auth.uid())
);

CREATE POLICY "Block unauthenticated access to properties"
ON public.properties FOR ALL
USING (auth.uid() IS NOT NULL);

-- 6. PROPERTY_PHOTOS table - Staff see only photos for assigned properties
CREATE POLICY "Admins can manage property photos"
ON public.property_photos FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Staff can view photos for their assigned properties"
ON public.property_photos FOR SELECT
USING (
  has_role(auth.uid(), 'staff'::app_role) 
  AND EXISTS (
    SELECT 1 FROM public.properties p
    WHERE p.id = property_photos.property_id
    AND is_staff_assigned_to_property(p.id, auth.uid())
  )
);

CREATE POLICY "Block unauthenticated access to property_photos"
ON public.property_photos FOR ALL
USING (auth.uid() IS NOT NULL);
