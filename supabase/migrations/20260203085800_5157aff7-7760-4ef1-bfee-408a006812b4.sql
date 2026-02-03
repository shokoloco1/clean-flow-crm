-- Remove the public access policy for company settings
DROP POLICY IF EXISTS "Public can read company settings" ON public.system_settings;

-- Create policy requiring authentication to read company settings
CREATE POLICY "Authenticated users can read company settings" 
ON public.system_settings 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL 
  AND key = ANY (ARRAY['company_name'::text, 'company_logo'::text])
);