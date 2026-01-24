-- Create storage bucket for property photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'property-photos', 
  'property-photos', 
  false,
  10485760, -- 10MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- RLS policies for property-photos bucket
CREATE POLICY "Admins can manage property photos"
ON storage.objects FOR ALL
USING (bucket_id = 'property-photos' AND public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Staff can view property photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'property-photos' AND (
  public.has_role(auth.uid(), 'admin'::public.app_role) OR 
  public.has_role(auth.uid(), 'staff'::public.app_role)
));