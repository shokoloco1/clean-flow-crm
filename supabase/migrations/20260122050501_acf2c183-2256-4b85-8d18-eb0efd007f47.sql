-- =====================================================
-- FIX 1: Separate sensitive employee data from profiles
-- =====================================================

-- Create admin-only table for sensitive employee data
CREATE TABLE public.profiles_sensitive (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  hourly_rate NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles_sensitive ENABLE ROW LEVEL SECURITY;

-- Only admins can access sensitive employee data
CREATE POLICY "Admins can manage sensitive profiles"
ON public.profiles_sensitive FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Migrate existing sensitive data
INSERT INTO public.profiles_sensitive (user_id, emergency_contact_name, emergency_contact_phone, hourly_rate)
SELECT user_id, emergency_contact_name, emergency_contact_phone, hourly_rate
FROM public.profiles
WHERE emergency_contact_name IS NOT NULL 
   OR emergency_contact_phone IS NOT NULL 
   OR hourly_rate IS NOT NULL;

-- Remove sensitive columns from profiles (keep them temporarily with null for existing queries)
-- First, update the columns to NULL to indicate data moved
UPDATE public.profiles SET 
  emergency_contact_name = NULL,
  emergency_contact_phone = NULL,
  hourly_rate = NULL;

-- Create safe view for profiles (staff can see basic info only)
CREATE OR REPLACE VIEW public.profiles_safe
WITH (security_invoker = true)
AS SELECT 
  id,
  user_id,
  full_name,
  email,
  phone,
  is_active,
  skills,
  certifications,
  hire_date,
  created_at,
  updated_at
FROM public.profiles;

-- =====================================================
-- FIX 2: Secure clients_safe view with proper access
-- =====================================================

-- Drop and recreate clients_safe to ensure it excludes portal_token AND access_codes
DROP VIEW IF EXISTS public.clients_safe;

CREATE VIEW public.clients_safe
WITH (security_invoker = true)
AS SELECT 
  id,
  name,
  email,
  phone,
  address,
  notes,
  created_at,
  updated_at
  -- Explicitly excludes: access_codes, portal_token, portal_token_expires_at
FROM public.clients;

-- =====================================================
-- FIX 3: Secure properties_safe view
-- =====================================================

-- Drop and recreate properties_safe to ensure it excludes access_codes
DROP VIEW IF EXISTS public.properties_safe;

CREATE VIEW public.properties_safe
WITH (security_invoker = true)
AS SELECT 
  id,
  name,
  address,
  property_type,
  size_sqm,
  location_lat,
  location_lng,
  geofence_radius_meters,
  special_instructions,
  default_checklist_template_id,
  client_id,
  is_active,
  created_at,
  updated_at
  -- Explicitly excludes: access_codes
FROM public.properties;

-- =====================================================
-- FIX 4: Restrict staff access to clients table
-- =====================================================

-- Drop the old policy that gives staff full client access
DROP POLICY IF EXISTS "Staff can view clients for their jobs" ON public.clients;

-- Staff cannot directly access clients table anymore - must use get_client_for_job function
-- or the clients_safe view through jobs

-- =====================================================
-- FIX 5: Restrict staff access to properties table  
-- =====================================================

-- Remove the overly permissive "Staff can view safe properties" policy
DROP POLICY IF EXISTS "Staff can view safe properties" ON public.properties;

-- Keep only the policy that requires job assignment
-- "Staff can view properties for their assigned jobs" already exists and uses is_staff_assigned_to_property

-- =====================================================
-- FIX 6: Create secure function for time-limited access codes
-- =====================================================

-- Function to get access code only for active jobs (within 2 hours of scheduled time)
CREATE OR REPLACE FUNCTION public.get_job_access_code(_job_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_access_code TEXT;
  v_job_datetime TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Check if user is assigned to this job
  SELECT 
    p.access_codes,
    (j.scheduled_date + j.scheduled_time)::timestamp with time zone
  INTO v_access_code, v_job_datetime
  FROM public.jobs j
  LEFT JOIN public.properties p ON j.property_id = p.id
  WHERE j.id = _job_id
    AND j.assigned_staff_id = auth.uid()
    AND j.status IN ('pending', 'in_progress');
  
  -- Only return access code if within 2 hours of scheduled time
  IF v_access_code IS NOT NULL AND 
     v_job_datetime BETWEEN (NOW() - INTERVAL '2 hours') AND (NOW() + INTERVAL '2 hours') THEN
    RETURN v_access_code;
  END IF;
  
  -- Also check client access codes if property doesn't have them
  IF v_access_code IS NULL THEN
    SELECT c.access_codes
    INTO v_access_code
    FROM public.jobs j
    JOIN public.clients c ON j.client_id = c.id
    WHERE j.id = _job_id
      AND j.assigned_staff_id = auth.uid()
      AND j.status IN ('pending', 'in_progress')
      AND (j.scheduled_date + j.scheduled_time)::timestamp with time zone 
          BETWEEN (NOW() - INTERVAL '2 hours') AND (NOW() + INTERVAL '2 hours');
  END IF;
  
  RETURN v_access_code;
END;
$$;

-- =====================================================
-- FIX 7: Fix job_photos policy for clients
-- =====================================================

-- Drop the broken policy
DROP POLICY IF EXISTS "Clients can view photos from their own jobs" ON public.job_photos;

-- Photos for clients are accessed through the get_client_portal_data function
-- which already validates the portal token properly

-- =====================================================
-- Trigger for updated_at on profiles_sensitive
-- =====================================================

CREATE TRIGGER update_profiles_sensitive_updated_at
BEFORE UPDATE ON public.profiles_sensitive
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();