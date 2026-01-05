-- Add GPS columns to jobs table
ALTER TABLE public.jobs 
ADD COLUMN IF NOT EXISTS location_lat double precision,
ADD COLUMN IF NOT EXISTS location_lng double precision;

-- Add access_codes to clients
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS access_codes text;

-- Create job_photos table for better photo management
CREATE TABLE IF NOT EXISTS public.job_photos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  photo_url text NOT NULL,
  photo_type text NOT NULL DEFAULT 'before' CHECK (photo_type IN ('before', 'after')),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on job_photos
ALTER TABLE public.job_photos ENABLE ROW LEVEL SECURITY;

-- RLS policies for job_photos
CREATE POLICY "Admins can manage all job photos"
ON public.job_photos
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Staff can view photos for their jobs"
ON public.job_photos
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.jobs 
    WHERE jobs.id = job_photos.job_id 
    AND jobs.assigned_staff_id = auth.uid()
  )
);

CREATE POLICY "Staff can upload photos for their jobs"
ON public.job_photos
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.jobs 
    WHERE jobs.id = job_photos.job_id 
    AND jobs.assigned_staff_id = auth.uid()
  )
);

-- Create storage bucket for job evidence photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'job-evidence', 
  'job-evidence', 
  true,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic']
) ON CONFLICT (id) DO NOTHING;

-- Storage policies for job-evidence bucket
CREATE POLICY "Anyone can view job evidence photos"
ON storage.objects
FOR SELECT
USING (bucket_id = 'job-evidence');

CREATE POLICY "Authenticated users can upload job evidence"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'job-evidence' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can update their own uploads"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'job-evidence' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own uploads"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'job-evidence' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);