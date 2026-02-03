-- Add SELECT policy for profiles_sensitive to allow users to view their own sensitive data
CREATE POLICY "Users can view their own sensitive profile"
ON public.profiles_sensitive
FOR SELECT
USING (auth.uid() = user_id);