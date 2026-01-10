
-- Create checklist_templates table for reusable templates
CREATE TABLE public.checklist_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  template_type TEXT NOT NULL DEFAULT 'residential', -- residential, commercial, airbnb, medical
  tasks JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create properties table
CREATE TABLE public.properties (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  location_lat DOUBLE PRECISION,
  location_lng DOUBLE PRECISION,
  size_sqm DOUBLE PRECISION,
  property_type TEXT NOT NULL DEFAULT 'residential', -- residential, commercial, airbnb, medical
  special_instructions TEXT,
  access_codes TEXT,
  geofence_radius_meters INTEGER NOT NULL DEFAULT 100,
  default_checklist_template_id UUID REFERENCES public.checklist_templates(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create property_photos table for reference photos
CREATE TABLE public.property_photos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  room_area TEXT, -- kitchen, bathroom, bedroom, etc.
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add property_id to jobs table (keep location for backwards compatibility)
ALTER TABLE public.jobs ADD COLUMN property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL;

-- Enable RLS on new tables
ALTER TABLE public.checklist_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_photos ENABLE ROW LEVEL SECURITY;

-- RLS Policies for checklist_templates
CREATE POLICY "Admins can manage checklist templates"
ON public.checklist_templates FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Staff can view checklist templates"
ON public.checklist_templates FOR SELECT
USING (has_role(auth.uid(), 'staff'::app_role));

-- RLS Policies for properties
CREATE POLICY "Admins can manage properties"
ON public.properties FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Staff can view active properties"
ON public.properties FOR SELECT
USING (has_role(auth.uid(), 'staff'::app_role) AND is_active = true);

-- RLS Policies for property_photos
CREATE POLICY "Admins can manage property photos"
ON public.property_photos FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Staff can view property photos"
ON public.property_photos FOR SELECT
USING (has_role(auth.uid(), 'staff'::app_role));

-- Create triggers for updated_at
CREATE TRIGGER update_checklist_templates_updated_at
BEFORE UPDATE ON public.checklist_templates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_properties_updated_at
BEFORE UPDATE ON public.properties
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default checklist templates
INSERT INTO public.checklist_templates (name, description, template_type, is_default, tasks) VALUES
('Residential Standard', 'Standard cleaning checklist for residential properties', 'residential', true, '[
  {"room": "Kitchen", "tasks": ["Clean countertops", "Clean stovetop", "Clean microwave inside/out", "Clean sink", "Wipe cabinet fronts", "Mop floor"]},
  {"room": "Bathroom", "tasks": ["Clean toilet", "Clean shower/tub", "Clean sink and mirror", "Wipe counters", "Mop floor"]},
  {"room": "Bedrooms", "tasks": ["Make beds", "Dust surfaces", "Vacuum/mop floors", "Empty trash"]},
  {"room": "Living Areas", "tasks": ["Dust surfaces", "Vacuum floors", "Clean mirrors", "Tidy cushions"]}
]'::jsonb),
('Airbnb Turnover', 'Quick turnover checklist for vacation rentals', 'airbnb', true, '[
  {"room": "Kitchen", "tasks": ["Clean all appliances", "Wash dishes", "Restock supplies", "Clean counters", "Take out trash"]},
  {"room": "Bathroom", "tasks": ["Deep clean toilet", "Clean shower", "Replace towels", "Restock toiletries", "Clean mirror"]},
  {"room": "Bedrooms", "tasks": ["Change linens", "Make beds", "Check closets", "Dust all surfaces"]},
  {"room": "Common Areas", "tasks": ["Vacuum all floors", "Check amenities", "Wipe surfaces", "Check lights work"]}
]'::jsonb),
('Commercial Office', 'Standard office cleaning checklist', 'commercial', true, '[
  {"room": "Reception", "tasks": ["Clean desk surfaces", "Vacuum floors", "Empty trash", "Clean glass doors"]},
  {"room": "Offices", "tasks": ["Dust desks", "Empty trash bins", "Vacuum floors", "Wipe door handles"]},
  {"room": "Bathrooms", "tasks": ["Deep clean toilets", "Restock supplies", "Clean mirrors", "Mop floors"]},
  {"room": "Common Areas", "tasks": ["Clean kitchen area", "Wipe tables", "Empty dishwasher", "Take out trash"]}
]'::jsonb),
('Medical Facility', 'High-standard cleaning for medical environments', 'medical', true, '[
  {"room": "Waiting Area", "tasks": ["Disinfect all surfaces", "Clean chairs", "Vacuum floors", "Empty trash"]},
  {"room": "Exam Rooms", "tasks": ["Disinfect exam table", "Clean all surfaces", "Restock supplies", "Mop with disinfectant"]},
  {"room": "Bathrooms", "tasks": ["Deep disinfect toilet", "Clean sink", "Restock supplies", "Mop with disinfectant"]},
  {"room": "Common Areas", "tasks": ["Disinfect door handles", "Clean reception desk", "Empty biohazard bins properly"]}
]'::jsonb);
