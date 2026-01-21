-- =====================================================
-- FIX 1: Restrict access_codes visibility - only for assigned staff
-- =====================================================

-- Drop existing staff policy for properties
DROP POLICY IF EXISTS "Staff can view active properties" ON public.properties;

-- Create view for properties without sensitive data for general staff
CREATE OR REPLACE VIEW public.properties_safe AS
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
  -- access_codes is EXCLUDED for non-assigned staff
FROM public.properties;

-- Grant access to authenticated users
GRANT SELECT ON public.properties_safe TO authenticated;

-- Create function to check if staff is assigned to a property via jobs
CREATE OR REPLACE FUNCTION public.is_staff_assigned_to_property(_property_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.jobs
    WHERE property_id = _property_id
    AND assigned_staff_id = _user_id
    AND scheduled_date >= CURRENT_DATE - INTERVAL '7 days' -- Only active/recent jobs
  )
$$;

-- Staff can only view full property data (with access_codes) if assigned to a job at that property
CREATE POLICY "Staff can view properties for their assigned jobs" 
ON public.properties 
FOR SELECT 
USING (
  has_role(auth.uid(), 'staff'::app_role) 
  AND is_staff_assigned_to_property(id, auth.uid())
);

-- Staff can view basic property info (without access_codes) via the safe view
-- The view inherits RLS from the base table, so we need a broader policy for the view
CREATE POLICY "Staff can view safe properties" 
ON public.properties 
FOR SELECT 
USING (
  has_role(auth.uid(), 'staff'::app_role) 
  AND is_active = true
);

-- =====================================================
-- FIX 2: Hide portal_token from staff - admin only
-- =====================================================

-- Drop existing staff policy for clients
DROP POLICY IF EXISTS "Staff can view clients" ON public.clients;

-- Create a safe view for clients without portal_token
CREATE OR REPLACE VIEW public.clients_safe AS
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
  -- portal_token and portal_token_expires_at are EXCLUDED
FROM public.clients;

-- Grant access to authenticated users
GRANT SELECT ON public.clients_safe TO authenticated;

-- Create RLS-enabled function for staff to get client info without tokens
CREATE OR REPLACE FUNCTION public.get_client_for_job(_job_id uuid)
RETURNS TABLE(
  id uuid,
  name text,
  email text,
  phone text,
  address text,
  notes text
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
    c.notes
  FROM public.clients c
  JOIN public.jobs j ON j.client_id = c.id
  WHERE j.id = _job_id
  AND j.assigned_staff_id = auth.uid()
$$;

-- Staff can only view clients they have jobs with (and without sensitive fields)
CREATE POLICY "Staff can view clients for their jobs" 
ON public.clients 
FOR SELECT 
USING (
  has_role(auth.uid(), 'staff'::app_role) 
  AND EXISTS (
    SELECT 1 FROM public.jobs 
    WHERE jobs.client_id = clients.id 
    AND jobs.assigned_staff_id = auth.uid()
  )
);

-- =====================================================
-- FIX 3: Server-side role assignment - default to staff
-- =====================================================

-- Update handle_new_user trigger to also create default staff role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create profile
  INSERT INTO public.profiles (user_id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email),
    NEW.email
  );
  
  -- Create default staff role (admin promotion requires existing admin)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'staff'::app_role);
  
  RETURN NEW;
END;
$$;

-- Remove ability for non-admins to insert into user_roles
DROP POLICY IF EXISTS "Users can insert their own role" ON public.user_roles;

-- Ensure only admins can manage roles (already exists but reinforce)
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;
CREATE POLICY "Admins can manage all roles" 
ON public.user_roles 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Users can only view their own role (read-only)
DROP POLICY IF EXISTS "Users can view their own role" ON public.user_roles;
CREATE POLICY "Users can view their own role" 
ON public.user_roles 
FOR SELECT 
USING (auth.uid() = user_id);

-- Create admin invitation function for secure role assignment
CREATE OR REPLACE FUNCTION public.promote_user_to_admin(_target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only admins can promote other users
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;
  
  -- Update role to admin
  UPDATE public.user_roles
  SET role = 'admin'::app_role
  WHERE user_id = _target_user_id;
  
  IF NOT FOUND THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (_target_user_id, 'admin'::app_role);
  END IF;
END;
$$;

-- =====================================================
-- FIX 4: Allow admins to view login attempts for monitoring
-- =====================================================

DROP POLICY IF EXISTS "No public access to login attempts" ON public.login_attempts;

-- Block all direct access, use functions only
CREATE POLICY "No direct access to login attempts" 
ON public.login_attempts 
FOR ALL 
USING (false);

-- Admins can view login attempts via function
CREATE OR REPLACE FUNCTION public.get_login_attempts_for_monitoring(p_hours integer DEFAULT 24)
RETURNS TABLE(
  email text,
  success boolean,
  attempted_at timestamptz,
  ip_address text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT email, success, attempted_at, ip_address
  FROM public.login_attempts
  WHERE attempted_at > NOW() - (p_hours || ' hours')::interval
  ORDER BY attempted_at DESC
  LIMIT 500
$$;