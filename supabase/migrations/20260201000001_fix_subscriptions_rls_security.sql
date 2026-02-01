-- FIX CRITICAL SECURITY: The previous policy allowed ANY authenticated user to modify subscriptions
-- This migration fixes the RLS policy to only allow service_role (webhooks) to modify data

-- Drop the insecure policy
DROP POLICY IF EXISTS "Service role manages subscriptions" ON public.subscriptions;

-- Create proper policy that only allows service_role to insert/update/delete
-- Note: service_role bypasses RLS, but we add this for documentation and defense in depth
CREATE POLICY "Only service role can insert subscriptions"
ON public.subscriptions FOR INSERT
WITH CHECK (false); -- No regular user can insert, only service_role which bypasses RLS

CREATE POLICY "Only service role can update subscriptions"
ON public.subscriptions FOR UPDATE
USING (false); -- No regular user can update, only service_role which bypasses RLS

CREATE POLICY "Only service role can delete subscriptions"
ON public.subscriptions FOR DELETE
USING (false); -- No regular user can delete, only service_role which bypasses RLS

-- Add comment explaining the security model
COMMENT ON TABLE public.subscriptions IS 'Stripe subscription data. Only modifiable via webhooks (service_role). Users can only SELECT their own subscription.';
