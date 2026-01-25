
-- Fix SECURITY DEFINER view warning by converting to SECURITY INVOKER
-- The profiles_public view was created without security_invoker, causing the warning

DROP VIEW IF EXISTS public.profiles_public;

CREATE VIEW public.profiles_public
WITH (security_invoker = on) AS
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
FROM public.profiles;
