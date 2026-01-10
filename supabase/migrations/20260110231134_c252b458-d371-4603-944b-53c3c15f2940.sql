-- Create recurring_schedules table for recurring jobs
CREATE TABLE public.recurring_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  assigned_staff_id UUID,
  location TEXT NOT NULL,
  scheduled_time TIME WITHOUT TIME ZONE NOT NULL DEFAULT '09:00',
  notes TEXT,
  checklist JSONB DEFAULT '[]'::jsonb,
  
  -- Recurrence settings
  frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'biweekly', 'monthly')),
  days_of_week INTEGER[] DEFAULT '{}', -- 0=Sunday, 1=Monday, etc. For weekly/biweekly
  day_of_month INTEGER, -- For monthly (1-31)
  
  -- Status and tracking
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_generated_date DATE,
  next_generation_date DATE,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.recurring_schedules ENABLE ROW LEVEL SECURITY;

-- Admins can manage all recurring schedules
CREATE POLICY "Admins can manage recurring schedules"
ON public.recurring_schedules
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Staff can view their assigned recurring schedules
CREATE POLICY "Staff can view their recurring schedules"
ON public.recurring_schedules
FOR SELECT
USING (auth.uid() = assigned_staff_id);

-- Create trigger for updated_at
CREATE TRIGGER update_recurring_schedules_updated_at
BEFORE UPDATE ON public.recurring_schedules
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for faster queries
CREATE INDEX idx_recurring_schedules_next_generation ON public.recurring_schedules(next_generation_date) WHERE is_active = true;
CREATE INDEX idx_recurring_schedules_client ON public.recurring_schedules(client_id);

-- Enable realtime for recurring_schedules
ALTER PUBLICATION supabase_realtime ADD TABLE public.recurring_schedules;