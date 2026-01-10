
-- Add extended staff fields to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS emergency_contact_name text,
ADD COLUMN IF NOT EXISTS emergency_contact_phone text,
ADD COLUMN IF NOT EXISTS skills jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS certifications jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS hire_date date,
ADD COLUMN IF NOT EXISTS hourly_rate numeric(10,2),
ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

-- Create staff availability table
CREATE TABLE public.staff_availability (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  day_of_week integer NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time time NOT NULL DEFAULT '08:00',
  end_time time NOT NULL DEFAULT '17:00',
  is_available boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, day_of_week)
);

-- Enable RLS
ALTER TABLE public.staff_availability ENABLE ROW LEVEL SECURITY;

-- Policies for staff_availability
CREATE POLICY "Admins can manage all staff availability"
ON public.staff_availability
FOR ALL
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Staff can view their own availability"
ON public.staff_availability
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Staff can update their own availability"
ON public.staff_availability
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Staff can insert their own availability"
ON public.staff_availability
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Add quality_score to jobs for performance tracking
ALTER TABLE public.jobs
ADD COLUMN IF NOT EXISTS quality_score integer CHECK (quality_score >= 1 AND quality_score <= 5);

-- Create trigger for updated_at on staff_availability
CREATE TRIGGER update_staff_availability_updated_at
BEFORE UPDATE ON public.staff_availability
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Allow admins to update all profiles (for managing staff)
CREATE POLICY "Admins can update all profiles"
ON public.profiles
FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

-- Allow admins to insert profiles (for creating staff)
CREATE POLICY "Admins can insert profiles"
ON public.profiles
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'));
