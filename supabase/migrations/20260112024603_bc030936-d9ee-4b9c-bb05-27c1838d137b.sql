-- Drop the security definer view and create a regular function instead
DROP VIEW IF EXISTS public.client_portal_jobs;

-- Create a security definer function to get client jobs by token (safer approach)
CREATE OR REPLACE FUNCTION public.get_client_portal_data(p_token text)
RETURNS TABLE (
  id uuid,
  client_id uuid,
  client_name text,
  location text,
  scheduled_date date,
  scheduled_time time,
  status text,
  start_time timestamptz,
  end_time timestamptz,
  notes text,
  staff_name text,
  property_name text,
  photos jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client_id uuid;
BEGIN
  -- First validate the token and get the client_id
  SELECT c.id INTO v_client_id
  FROM public.clients c
  WHERE c.portal_token = p_token;
  
  IF v_client_id IS NULL THEN
    RETURN; -- Return empty if invalid token
  END IF;
  
  -- Return the client's jobs with photos
  RETURN QUERY
  SELECT 
    j.id,
    j.client_id,
    cl.name as client_name,
    j.location,
    j.scheduled_date,
    j.scheduled_time,
    j.status,
    j.start_time,
    j.end_time,
    j.notes,
    p.full_name as staff_name,
    prop.name as property_name,
    COALESCE(
      (SELECT jsonb_agg(jsonb_build_object(
        'id', jp.id,
        'photo_url', jp.photo_url,
        'photo_type', jp.photo_type,
        'created_at', jp.created_at
      ) ORDER BY jp.created_at)
      FROM public.job_photos jp
      WHERE jp.job_id = j.id
      ), '[]'::jsonb
    ) as photos
  FROM public.jobs j
  JOIN public.clients cl ON j.client_id = cl.id
  LEFT JOIN public.profiles p ON j.assigned_staff_id = p.user_id
  LEFT JOIN public.properties prop ON j.property_id = prop.id
  WHERE j.client_id = v_client_id
  ORDER BY j.scheduled_date DESC, j.scheduled_time DESC;
END;
$$;

-- Grant execute to anon and authenticated users (for public portal access)
GRANT EXECUTE ON FUNCTION public.get_client_portal_data(text) TO anon, authenticated;