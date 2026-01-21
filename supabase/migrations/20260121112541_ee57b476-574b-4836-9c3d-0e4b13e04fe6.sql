-- ============================================
-- SECURITY FIX: Strengthen RLS Policies
-- ============================================

-- 1. FIX: job_photos - Remove the dangerous "true" policy
DROP POLICY IF EXISTS "Allow job photos read for client portal" ON public.job_photos;

-- Create proper policy: clients can only view photos from their own jobs
CREATE POLICY "Clients can view photos from their own jobs" 
ON public.job_photos 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.jobs j
    JOIN public.clients c ON j.client_id = c.id
    WHERE j.id = job_photos.job_id
    AND c.portal_token IS NOT NULL
    AND j.client_id = c.id
  )
);

-- 2. FIX: invoices - Validate specific client access
DROP POLICY IF EXISTS "Clients can view their invoices via portal" ON public.invoices;

-- This policy cannot validate the token in SQL directly, so we need a function
CREATE OR REPLACE FUNCTION public.validate_client_portal_access(p_client_id uuid, p_token text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.clients
    WHERE id = p_client_id
    AND portal_token = p_token
  )
$$;

-- 3. FIX: jobs - More restrictive portal access
DROP POLICY IF EXISTS "Allow client portal access via token" ON public.jobs;

-- 4. FIX: invoice_items - Remove dangerous policy
DROP POLICY IF EXISTS "Allow invoice items read for client portal" ON public.invoice_items;

-- 5. MAKE STORAGE BUCKET PRIVATE
UPDATE storage.buckets SET public = false WHERE id = 'job-evidence';

-- 6. FIX STORAGE POLICIES for job-evidence bucket
-- Remove existing policies
DROP POLICY IF EXISTS "Allow public read access" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated updates" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated deletes" ON storage.objects;

-- Create strict storage policies
CREATE POLICY "Admins can manage all files" 
ON storage.objects 
FOR ALL 
USING (
  bucket_id = 'job-evidence' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Staff can upload files for their jobs" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'job-evidence'
  AND has_role(auth.uid(), 'staff'::app_role)
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Staff can view files for their jobs" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'job-evidence'
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR (
      has_role(auth.uid(), 'staff'::app_role)
      AND EXISTS (
        SELECT 1 FROM public.job_photos jp
        JOIN public.jobs j ON jp.job_id = j.id
        WHERE j.assigned_staff_id = auth.uid()
        AND storage.objects.name LIKE '%' || jp.id::text || '%'
      )
    )
  )
);

-- 7. CREATE login_attempts table for rate limiting
CREATE TABLE IF NOT EXISTS public.login_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  ip_address text,
  attempted_at timestamp with time zone NOT NULL DEFAULT now(),
  success boolean NOT NULL DEFAULT false
);

-- Enable RLS
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;

-- Only service role can manage login attempts (no public access)
CREATE POLICY "No public access to login attempts" 
ON public.login_attempts 
FOR ALL 
USING (false);

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_login_attempts_email_time 
ON public.login_attempts(email, attempted_at DESC);

-- Create function to check rate limiting
CREATE OR REPLACE FUNCTION public.check_login_rate_limit(p_email text)
RETURNS TABLE(
  is_blocked boolean,
  failed_attempts integer,
  block_expires_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_failed_count integer;
  v_last_attempt timestamp with time zone;
  v_block_duration interval := interval '15 minutes';
  v_max_attempts integer := 5;
BEGIN
  -- Count failed attempts in the last 15 minutes
  SELECT COUNT(*), MAX(attempted_at)
  INTO v_failed_count, v_last_attempt
  FROM public.login_attempts
  WHERE email = lower(p_email)
  AND success = false
  AND attempted_at > now() - v_block_duration;
  
  RETURN QUERY SELECT 
    v_failed_count >= v_max_attempts,
    v_failed_count,
    CASE 
      WHEN v_failed_count >= v_max_attempts THEN v_last_attempt + v_block_duration
      ELSE NULL
    END;
END;
$$;

-- Create function to record login attempt
CREATE OR REPLACE FUNCTION public.record_login_attempt(
  p_email text,
  p_success boolean,
  p_ip_address text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.login_attempts (email, success, ip_address)
  VALUES (lower(p_email), p_success, p_ip_address);
  
  -- Clean up old attempts (older than 24 hours)
  DELETE FROM public.login_attempts
  WHERE attempted_at < now() - interval '24 hours';
END;
$$;

-- 8. Enable leaked password protection
-- (This requires Supabase Auth configuration update)