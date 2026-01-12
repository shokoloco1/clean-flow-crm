-- Create system settings table
CREATE TABLE public.system_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key text NOT NULL UNIQUE,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can manage settings
CREATE POLICY "Admins can manage system settings"
  ON public.system_settings
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow public read for certain settings (like company info)
CREATE POLICY "Public can read company settings"
  ON public.system_settings
  FOR SELECT
  USING (key IN ('company_name', 'company_logo'));

-- Add trigger for updated_at
CREATE TRIGGER update_system_settings_updated_at
  BEFORE UPDATE ON public.system_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default settings
INSERT INTO public.system_settings (key, value, description) VALUES
  ('company_name', '"CleanTrack Pro"', 'Nombre de la empresa'),
  ('company_logo', '""', 'URL del logo de la empresa'),
  ('default_geofence_radius', '100', 'Radio de geofence por defecto en metros'),
  ('working_hours', '{"start": "08:00", "end": "18:00"}', 'Horario laboral'),
  ('working_days', '[1, 2, 3, 4, 5]', 'Días laborales (0=Domingo, 6=Sábado)');