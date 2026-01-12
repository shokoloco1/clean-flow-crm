-- Add portal access token to clients table
ALTER TABLE public.clients 
ADD COLUMN portal_token text UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex');

-- Create index for fast token lookups
CREATE INDEX idx_clients_portal_token ON public.clients(portal_token);

-- Create a view for client portal data (jobs with photos)
CREATE OR REPLACE VIEW public.client_portal_jobs AS
SELECT 
  j.id,
  j.client_id,
  j.location,
  j.scheduled_date,
  j.scheduled_time,
  j.status,
  j.start_time,
  j.end_time,
  j.notes,
  p.full_name as staff_name,
  prop.name as property_name,
  (
    SELECT json_agg(json_build_object(
      'id', jp.id,
      'photo_url', jp.photo_url,
      'photo_type', jp.photo_type,
      'created_at', jp.created_at
    ) ORDER BY jp.created_at)
    FROM public.job_photos jp
    WHERE jp.job_id = j.id
  ) as photos
FROM public.jobs j
LEFT JOIN public.profiles p ON j.assigned_staff_id = p.user_id
LEFT JOIN public.properties prop ON j.property_id = prop.id;

-- RLS policy for client portal - allows access via token
CREATE POLICY "Allow client portal access via token"
ON public.jobs
FOR SELECT
USING (
  client_id IN (
    SELECT id FROM public.clients WHERE portal_token IS NOT NULL
  )
);

-- Allow public read on job_photos for portal (photos are already in public bucket)
CREATE POLICY "Allow job photos read for client portal"
ON public.job_photos
FOR SELECT
USING (true);