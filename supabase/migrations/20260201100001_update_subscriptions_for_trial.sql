-- Migration: Update subscriptions table for trial with credit card required upfront
-- This enables 14-day trial tracking with Stripe payment method on file

-- Add new columns to subscriptions table
ALTER TABLE public.subscriptions
ADD COLUMN IF NOT EXISTS plan TEXT,
ADD COLUMN IF NOT EXISTS trial_start TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS trial_end TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS is_annual BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS payment_method_id TEXT;

-- Add comment for the new columns
COMMENT ON COLUMN public.subscriptions.plan IS 'Plan name: starter, professional, or business';
COMMENT ON COLUMN public.subscriptions.trial_start IS 'Start date of the trial period';
COMMENT ON COLUMN public.subscriptions.trial_end IS 'End date of the trial period (14 days from start)';
COMMENT ON COLUMN public.subscriptions.is_annual IS 'Whether this is an annual subscription';
COMMENT ON COLUMN public.subscriptions.payment_method_id IS 'Stripe payment method ID for the subscription';

-- Create index for trial queries
CREATE INDEX IF NOT EXISTS idx_subscriptions_trial_end ON public.subscriptions(trial_end);
CREATE INDEX IF NOT EXISTS idx_subscriptions_plan ON public.subscriptions(plan);
