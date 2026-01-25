-- Add ABN field to clients table for Australian business identification
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS abn text;

-- Add comment for documentation
COMMENT ON COLUMN public.clients.abn IS 'Australian Business Number or client identifier';