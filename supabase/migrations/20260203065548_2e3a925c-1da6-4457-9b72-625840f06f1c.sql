-- Fix: Restrict profiles_public view to authenticated users only
-- The view currently exposes employee emails, phone numbers, and full names publicly

-- Revoke all public access to the view
REVOKE ALL ON public.profiles_public FROM anon;
REVOKE ALL ON public.profiles_public FROM public;

-- Grant access only to authenticated users
GRANT SELECT ON public.profiles_public TO authenticated;

-- Also fix the properties_staff_view which has the same issue
REVOKE ALL ON public.properties_staff_view FROM anon;
REVOKE ALL ON public.properties_staff_view FROM public;

-- Grant access only to authenticated users
GRANT SELECT ON public.properties_staff_view TO authenticated;