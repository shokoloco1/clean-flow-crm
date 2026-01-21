-- Add portal token expiration column to clients table
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS portal_token_expires_at TIMESTAMPTZ;

-- Set expiration for existing tokens (90 days from now)
UPDATE public.clients
SET portal_token_expires_at = NOW() + INTERVAL '90 days'
WHERE portal_token IS NOT NULL AND portal_token_expires_at IS NULL;

-- Create or replace the get_client_portal_data function to check expiration
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
  v_expires_at timestamptz;
BEGIN
  -- Validate token and check expiration
  SELECT c.id, c.portal_token_expires_at 
  INTO v_client_id, v_expires_at
  FROM public.clients c
  WHERE c.portal_token = p_token;
  
  -- Return empty if invalid or expired token
  IF v_client_id IS NULL OR v_expires_at IS NULL OR v_expires_at < NOW() THEN
    RETURN;
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

-- Create function to rotate client portal token (admin only)
CREATE OR REPLACE FUNCTION public.rotate_client_portal_token(
  p_client_id uuid,
  p_validity_days integer DEFAULT 90
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_token text;
BEGIN
  -- Only allow admins to rotate tokens
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;
  
  -- Generate new token
  v_new_token := encode(gen_random_bytes(16), 'hex');
  
  -- Update client with new token and expiration
  UPDATE public.clients
  SET portal_token = v_new_token,
      portal_token_expires_at = NOW() + (p_validity_days || ' days')::interval
  WHERE id = p_client_id;
  
  RETURN v_new_token;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.rotate_client_portal_token(uuid, integer) TO authenticated;

-- Create portal access log table for audit trail
CREATE TABLE IF NOT EXISTS public.portal_access_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE,
  accessed_at timestamptz NOT NULL DEFAULT NOW(),
  ip_address text,
  user_agent text,
  action text
);

-- Enable RLS on portal access log
ALTER TABLE public.portal_access_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view portal access logs
CREATE POLICY "Admins can view portal access logs"
ON public.portal_access_log
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Block public access to portal_access_log
CREATE POLICY "Block public access to portal_access_log"
ON public.portal_access_log
FOR ALL
USING (auth.uid() IS NOT NULL);

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_portal_access_client_time 
ON public.portal_access_log(client_id, accessed_at DESC);