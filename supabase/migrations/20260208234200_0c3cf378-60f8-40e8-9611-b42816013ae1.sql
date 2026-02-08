-- FIX 1: Remove staff access to clients table and force use of safe function
-- Drop existing staff policy that allows direct table access
DROP POLICY IF EXISTS "Staff can view assigned clients only" ON public.clients;

-- Create/replace a SECURITY DEFINER function that excludes sensitive columns
CREATE OR REPLACE FUNCTION public.get_staff_assigned_clients()
RETURNS TABLE (
  id uuid,
  name text,
  email text,
  phone text,
  address text,
  abn text,
  notes text,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT
    c.id,
    c.name,
    c.email,
    c.phone,
    c.address,
    c.abn,
    c.notes,
    c.created_at,
    c.updated_at
  FROM public.clients c
  JOIN public.jobs j ON j.client_id = c.id
  WHERE j.assigned_staff_id = auth.uid()
    AND j.scheduled_date >= CURRENT_DATE - INTERVAL '7 days';
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_staff_assigned_clients() TO authenticated;

-- FIX 2: Secure the profiles_public view by revoking public access
-- Revoke SELECT from anon role on the view
REVOKE SELECT ON public.profiles_public FROM anon;

-- Also revoke from public role to be safe
REVOKE SELECT ON public.profiles_public FROM public;

-- Create RLS-like policy by recreating the view with SECURITY INVOKER
-- and adding a policy function check
DROP VIEW IF EXISTS public.profiles_public;

CREATE VIEW public.profiles_public
WITH (security_invoker = true)
AS
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
  -- Only authenticated users can see profiles
  auth.uid() IS NOT NULL
  AND (
    -- Admins can see all profiles
    has_role(auth.uid(), 'admin'::app_role)
    OR 
    -- Users can see their own profile
    auth.uid() = p.user_id
  );

-- Grant SELECT only to authenticated users
GRANT SELECT ON public.profiles_public TO authenticated;

-- Ensure anon cannot access
REVOKE ALL ON public.profiles_public FROM anon;
REVOKE ALL ON public.profiles_public FROM public;