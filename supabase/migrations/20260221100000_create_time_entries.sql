-- Time tracking entries linked to jobs and staff
CREATE TABLE public.time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES public.jobs(id) NOT NULL,
  staff_id UUID REFERENCES public.profiles(user_id) NOT NULL,
  clock_in TIMESTAMPTZ NOT NULL,
  clock_out TIMESTAMPTZ,
  total_minutes INTEGER,
  break_minutes INTEGER DEFAULT 0,
  billable_minutes INTEGER, -- auto-computed by trigger
  clock_in_lat DECIMAL(10, 7),
  clock_in_lng DECIMAL(10, 7),
  clock_out_lat DECIMAL(10, 7),
  clock_out_lng DECIMAL(10, 7),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'edited', 'disputed')),
  staff_notes TEXT,
  admin_notes TEXT,
  edited_by UUID,
  edited_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_time_entries_staff ON public.time_entries(staff_id);
CREATE INDEX idx_time_entries_job ON public.time_entries(job_id);
CREATE INDEX idx_time_entries_clock_in ON public.time_entries(clock_in);
CREATE INDEX idx_time_entries_status ON public.time_entries(status);

-- Trigger: auto-compute billable_minutes = total_minutes - break_minutes
CREATE OR REPLACE FUNCTION public.compute_billable_minutes()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.total_minutes IS NOT NULL THEN
    NEW.billable_minutes := NEW.total_minutes - COALESCE(NEW.break_minutes, 0);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_compute_billable_minutes
  BEFORE INSERT OR UPDATE ON public.time_entries
  FOR EACH ROW EXECUTE FUNCTION public.compute_billable_minutes();

-- RLS
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view own time entries" ON public.time_entries
  FOR SELECT USING (staff_id = auth.uid());

CREATE POLICY "Staff can insert own time entries" ON public.time_entries
  FOR INSERT WITH CHECK (staff_id = auth.uid());

CREATE POLICY "Staff can update own active entries" ON public.time_entries
  FOR UPDATE USING (staff_id = auth.uid() AND status = 'active' AND clock_out IS NULL);

CREATE POLICY "Admin can view all time entries" ON public.time_entries
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can update all time entries" ON public.time_entries
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
