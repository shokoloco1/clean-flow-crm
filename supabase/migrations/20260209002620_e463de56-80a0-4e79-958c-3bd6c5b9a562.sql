-- Add staff workflow fields to jobs table
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS staff_notes text;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS issue_reported text;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS actual_duration_minutes integer;

-- Add photo metadata fields to job_photos table
ALTER TABLE public.job_photos ADD COLUMN IF NOT EXISTS area text;
ALTER TABLE public.job_photos ADD COLUMN IF NOT EXISTS taken_at timestamptz DEFAULT now();

-- Create index for efficient photo queries by area
CREATE INDEX IF NOT EXISTS idx_job_photos_area ON public.job_photos(job_id, area);