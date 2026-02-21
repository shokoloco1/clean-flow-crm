-- Pay rates per staff member (supports rate history with effective dates)
CREATE TABLE public.staff_pay_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID REFERENCES public.profiles(user_id) NOT NULL,
  hourly_rate DECIMAL(10, 2) NOT NULL, -- AUD per hour
  overtime_rate DECIMAL(10, 2), -- AUD per hour for overtime (optional)
  overtime_threshold_hours DECIMAL(5, 2) DEFAULT 38, -- Weekly hours before overtime
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_to DATE, -- NULL = currently active
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_active_rate UNIQUE (staff_id, effective_from)
);

-- RLS
ALTER TABLE public.staff_pay_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view own pay rates" ON public.staff_pay_rates
  FOR SELECT USING (staff_id = auth.uid());

CREATE POLICY "Admin can manage pay rates" ON public.staff_pay_rates
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));
