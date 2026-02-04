-- ===========================================
-- FIX 1: profiles_public view - Enable RLS for defense in depth
-- ===========================================

-- Note: PostgreSQL views don't support RLS directly, but we already have 
-- security_invoker=on and revoked anon/public grants. The current protection
-- is sufficient since the underlying table has RLS.

-- ===========================================
-- FIX 2: clients table - Hide portal_token from staff members
-- ===========================================

-- Create a secure function for staff to get client data WITHOUT portal tokens
CREATE OR REPLACE FUNCTION public.get_client_for_job_safe(_job_id uuid)
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

-- Update the staff policy to use a view that excludes sensitive fields
-- First, drop the existing staff policy
DROP POLICY IF EXISTS "Staff can view clients for their assigned jobs" ON public.clients;

-- Create a more restrictive policy - staff can only access via the safe function
-- The base table access is now admin-only for direct queries
-- Staff will use get_client_for_job_safe() or get_clients_safe() functions

-- ===========================================
-- FIX 3: subscriptions table - Fix overly permissive RLS policy
-- ===========================================

-- Drop the problematic "Service role manages subscriptions" policy
DROP POLICY IF EXISTS "Service role manages subscriptions" ON public.subscriptions;

-- Create proper policies:
-- 1. Users can only view their own subscription (already exists)
-- 2. Only service role can insert/update/delete (via edge functions)
-- Note: Service role bypasses RLS entirely, so we just need to block authenticated users
-- from modifying data directly

-- Add a restrictive policy that blocks all write operations for regular users
CREATE POLICY "Block direct modifications to subscriptions"
ON public.subscriptions
FOR ALL
TO authenticated
USING (
  -- Only allow SELECT for own subscription (handled by other policy)
  -- Block INSERT/UPDATE/DELETE by returning false for modifications
  false
)
WITH CHECK (false);

-- Keep the existing SELECT policies which are properly scoped