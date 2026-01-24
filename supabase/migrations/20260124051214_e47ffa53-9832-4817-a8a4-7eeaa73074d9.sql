-- Create price_lists table
CREATE TABLE public.price_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('pdf', 'xlsx', 'xls', 'csv')),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.price_lists ENABLE ROW LEVEL SECURITY;

-- Block public access
CREATE POLICY "Block public access to price_lists"
ON public.price_lists FOR ALL
USING (auth.uid() IS NOT NULL);

-- Only admins can manage price lists
CREATE POLICY "Admins can manage price lists"
ON public.price_lists FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Staff can view active price lists
CREATE POLICY "Staff can view active price lists"
ON public.price_lists FOR SELECT
USING (public.has_role(auth.uid(), 'staff') AND is_active = TRUE);

-- Trigger for updated_at
CREATE TRIGGER update_price_lists_updated_at
BEFORE UPDATE ON public.price_lists
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for price lists
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'price-lists', 
  'price-lists', 
  false,
  10485760, -- 10MB limit
  ARRAY['application/pdf', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel', 'text/csv']
);

-- Storage policies for price-lists bucket
CREATE POLICY "Admins can upload price lists"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'price-lists' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update price lists"
ON storage.objects FOR UPDATE
USING (bucket_id = 'price-lists' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete price lists"
ON storage.objects FOR DELETE
USING (bucket_id = 'price-lists' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can view price lists"
ON storage.objects FOR SELECT
USING (bucket_id = 'price-lists' AND auth.uid() IS NOT NULL);