-- Fix: Restrict view access to authenticated users only
-- Lovable security scanner flagged these views as publicly accessible
-- Even though security_invoker=on + base table RLS blocks anon reads,
-- explicitly revoking access adds defense-in-depth

-- profiles_public: employee names, emails, phones
REVOKE ALL ON public.profiles_public FROM anon, public;
GRANT SELECT ON public.profiles_public TO authenticated;

-- properties_staff_view: client addresses, property details
REVOKE ALL ON public.properties_staff_view FROM anon, public;
GRANT SELECT ON public.properties_staff_view TO authenticated;
