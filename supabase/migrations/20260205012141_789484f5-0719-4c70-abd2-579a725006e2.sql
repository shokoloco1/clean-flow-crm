-- Fix: clients_portal_token_exposure
-- Create a secure view for staff that excludes sensitive columns (portal_token, access_codes)
-- This prevents staff from seeing client portal tokens even when assigned to a client

-- Create a view for staff access that excludes sensitive columns
CREATE OR REPLACE VIEW public.clients_staff_view 
WITH (security_invoker = on) AS
SELECT 
  id,
  name,
  email,
  phone,
  address,
  abn,
  notes,
  created_at,
  updated_at
FROM public.clients;

-- Grant SELECT on the view to authenticated users
GRANT SELECT ON public.clients_staff_view TO authenticated;

-- Revoke direct access from anon and public roles
REVOKE ALL ON public.clients_staff_view FROM anon;
REVOKE ALL ON public.clients_staff_view FROM public;

-- Remove the staff SELECT policy on clients table
-- Staff should use get_client_for_job_safe() function or the new view
DROP POLICY IF EXISTS "Staff can view assigned clients only" ON public.clients;

-- Add a comment explaining the security model
COMMENT ON VIEW public.clients_staff_view IS 'Secure view for staff access - excludes portal_token, portal_token_expires_at, and access_codes to prevent token theft';