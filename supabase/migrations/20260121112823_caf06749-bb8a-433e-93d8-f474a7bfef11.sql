-- Block all public (unauthenticated) access to sensitive tables
-- These policies use PERMISSIVE mode but require authentication

-- CLIENTS: Block public access
CREATE POLICY "Block public access to clients"
ON public.clients FOR ALL
USING (auth.uid() IS NOT NULL);

-- PROFILES: Block public access  
CREATE POLICY "Block public access to profiles"
ON public.profiles FOR ALL
USING (auth.uid() IS NOT NULL);

-- JOBS: Block public access
CREATE POLICY "Block public access to jobs"
ON public.jobs FOR ALL
USING (auth.uid() IS NOT NULL);

-- JOB_PHOTOS: Block public access
CREATE POLICY "Block public access to job_photos"
ON public.job_photos FOR ALL
USING (auth.uid() IS NOT NULL);

-- PROPERTIES: Block public access
CREATE POLICY "Block public access to properties"
ON public.properties FOR ALL
USING (auth.uid() IS NOT NULL);

-- INVOICES: Block public access
CREATE POLICY "Block public access to invoices"
ON public.invoices FOR ALL
USING (auth.uid() IS NOT NULL);

-- INVOICE_ITEMS: Block public access
CREATE POLICY "Block public access to invoice_items"
ON public.invoice_items FOR ALL
USING (auth.uid() IS NOT NULL);

-- RECURRING_SCHEDULES: Block public access
CREATE POLICY "Block public access to recurring_schedules"
ON public.recurring_schedules FOR ALL
USING (auth.uid() IS NOT NULL);

-- CHECKLIST_ITEMS: Block public access
CREATE POLICY "Block public access to checklist_items"
ON public.checklist_items FOR ALL
USING (auth.uid() IS NOT NULL);

-- JOB_ALERTS: Block public access
CREATE POLICY "Block public access to job_alerts"
ON public.job_alerts FOR ALL
USING (auth.uid() IS NOT NULL);