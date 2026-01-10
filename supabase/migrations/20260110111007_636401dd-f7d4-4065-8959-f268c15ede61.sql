
-- Create alerts table for late arrivals and no-shows
CREATE TABLE public.job_alerts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  alert_type text NOT NULL CHECK (alert_type IN ('late_arrival', 'no_show', 'early_checkout', 'geofence_violation')),
  message text NOT NULL,
  is_resolved boolean NOT NULL DEFAULT false,
  resolved_at timestamp with time zone,
  resolved_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.job_alerts ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admins can manage all alerts"
ON public.job_alerts
FOR ALL
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Staff can view alerts for their jobs"
ON public.job_alerts
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM jobs WHERE jobs.id = job_alerts.job_id AND jobs.assigned_staff_id = auth.uid()
));

-- Add check-in/out location fields to jobs
ALTER TABLE public.jobs
ADD COLUMN IF NOT EXISTS checkin_lat double precision,
ADD COLUMN IF NOT EXISTS checkin_lng double precision,
ADD COLUMN IF NOT EXISTS checkout_lat double precision,
ADD COLUMN IF NOT EXISTS checkout_lng double precision,
ADD COLUMN IF NOT EXISTS checkin_distance_meters integer,
ADD COLUMN IF NOT EXISTS checkout_distance_meters integer,
ADD COLUMN IF NOT EXISTS geofence_validated boolean DEFAULT false;

-- Enable realtime for job_alerts
ALTER PUBLICATION supabase_realtime ADD TABLE public.job_alerts;

-- Index for faster alert queries
CREATE INDEX idx_job_alerts_job_id ON public.job_alerts(job_id);
CREATE INDEX idx_job_alerts_is_resolved ON public.job_alerts(is_resolved) WHERE is_resolved = false;
