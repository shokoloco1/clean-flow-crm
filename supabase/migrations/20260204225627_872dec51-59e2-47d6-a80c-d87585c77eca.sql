-- ===========================================
-- FIX 1: Restrict staff access to clients table
-- ===========================================

-- Staff should only view clients they're assigned to via jobs
-- The is_staff_assigned_to_client function already exists

CREATE POLICY "Staff can view assigned clients only"
ON public.clients FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'staff'::app_role) 
  AND is_staff_assigned_to_client(id, auth.uid())
);

-- ===========================================
-- FIX 2: Secure profiles_public view
-- ===========================================

-- PostgreSQL views don't support RLS directly, but we can restrict access
-- Revoke all access from anon and public roles (if not already done)
REVOKE ALL ON public.profiles_public FROM anon;
REVOKE ALL ON public.profiles_public FROM public;

-- Only authenticated users can access this view
GRANT SELECT ON public.profiles_public TO authenticated;

-- ===========================================
-- FIX 3: Secure properties_staff_view view
-- ===========================================

-- Revoke all access from anon and public roles
REVOKE ALL ON public.properties_staff_view FROM anon;
REVOKE ALL ON public.properties_staff_view FROM public;

-- Only authenticated users can access this view
GRANT SELECT ON public.properties_staff_view TO authenticated;