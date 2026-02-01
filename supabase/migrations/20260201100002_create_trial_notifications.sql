-- Migration: Create trial_notifications table for tracking email reminders
-- This table tracks which trial reminder emails have been sent to users

CREATE TABLE IF NOT EXISTS public.trial_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL CHECK (notification_type IN ('day_7', 'day_3', 'day_1', 'expired', 'converted')),
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, notification_type)
);

-- Enable RLS
ALTER TABLE public.trial_notifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own notifications
CREATE POLICY "Users can view own trial notifications"
ON public.trial_notifications FOR SELECT
USING (auth.uid() = user_id);

-- Only service role can insert/update (Edge Functions use service role)
CREATE POLICY "Service role inserts trial notifications"
ON public.trial_notifications FOR INSERT
WITH CHECK (false);

CREATE POLICY "Service role updates trial notifications"
ON public.trial_notifications FOR UPDATE
USING (false);

-- Admins can view all notifications
CREATE POLICY "Admins can view all trial notifications"
ON public.trial_notifications FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_trial_notifications_user ON public.trial_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_trial_notifications_type ON public.trial_notifications(notification_type);
CREATE INDEX IF NOT EXISTS idx_trial_notifications_sent_at ON public.trial_notifications(sent_at);

-- Comments
COMMENT ON TABLE public.trial_notifications IS 'Tracks trial reminder emails sent to users';
COMMENT ON COLUMN public.trial_notifications.notification_type IS 'Type of notification: day_7, day_3, day_1, expired, converted';
