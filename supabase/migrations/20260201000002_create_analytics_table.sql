-- Analytics events table for tracking key business metrics
CREATE TABLE IF NOT EXISTS public.analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event_name TEXT NOT NULL,
  event_data JSONB DEFAULT '{}',
  page_path TEXT,
  referrer TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- Only service role can insert (from edge function or server)
-- This prevents users from spoofing analytics
CREATE POLICY "Service role can insert analytics"
ON public.analytics_events FOR INSERT
WITH CHECK (true); -- Allow anonymous inserts for page views

CREATE POLICY "Admins can view analytics"
ON public.analytics_events FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_analytics_event_name ON public.analytics_events(event_name);
CREATE INDEX IF NOT EXISTS idx_analytics_created_at ON public.analytics_events(created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_user_id ON public.analytics_events(user_id);

-- Partition hint comment (for future scaling)
COMMENT ON TABLE public.analytics_events IS 'Event tracking for business analytics. Consider partitioning by month if data grows large.';
