-- Create table for advanced checklist items
CREATE TABLE public.checklist_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  room_name TEXT NOT NULL,
  task_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'done', 'na', 'issue')),
  issue_photo_url TEXT,
  issue_note TEXT,
  completed_at TIMESTAMP WITH TIME ZONE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.checklist_items ENABLE ROW LEVEL SECURITY;

-- Admins can manage all checklist items
CREATE POLICY "Admins can manage all checklist items"
ON public.checklist_items
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Staff can view checklist items for their assigned jobs
CREATE POLICY "Staff can view checklist items for their jobs"
ON public.checklist_items
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.jobs
    WHERE jobs.id = checklist_items.job_id
    AND jobs.assigned_staff_id = auth.uid()
  )
);

-- Staff can update checklist items for their assigned jobs
CREATE POLICY "Staff can update checklist items for their jobs"
ON public.checklist_items
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.jobs
    WHERE jobs.id = checklist_items.job_id
    AND jobs.assigned_staff_id = auth.uid()
  )
);

-- Create index for faster queries
CREATE INDEX idx_checklist_items_job_id ON public.checklist_items(job_id);

-- Add trigger for updated_at
CREATE TRIGGER update_checklist_items_updated_at
BEFORE UPDATE ON public.checklist_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for checklist_items
ALTER PUBLICATION supabase_realtime ADD TABLE public.checklist_items;