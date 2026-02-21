-- Generated pay reports (snapshots for historical accuracy)
CREATE TABLE public.pay_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  generated_by UUID NOT NULL,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  report_data JSONB NOT NULL,
  -- Structure: {
  --   staff: [{
  --     staff_id, name, hourly_rate,
  --     total_hours, overtime_hours, regular_hours,
  --     regular_pay, overtime_pay, total_pay,
  --     jobs: [{ job_id, client_name, date, hours, amount }]
  --   }],
  --   totals: { total_hours, total_pay, total_staff }
  -- }
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'exported')),
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  exported_format TEXT, -- 'pdf', 'csv'
  exported_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE public.pay_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage pay reports" ON public.pay_reports
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));
