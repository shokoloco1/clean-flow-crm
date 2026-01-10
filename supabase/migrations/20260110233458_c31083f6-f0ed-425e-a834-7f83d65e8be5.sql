-- Drop the overly permissive INSERT policy
DROP POLICY "Service role can insert notifications" ON public.notifications;

-- Create a more secure INSERT policy - only authenticated users can insert notifications for themselves or admins can insert for anyone
CREATE POLICY "Users can insert their own notifications" 
ON public.notifications 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create a function to create notifications (can be called by triggers)
CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id UUID,
  p_title TEXT,
  p_message TEXT,
  p_type TEXT DEFAULT 'info',
  p_related_job_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  INSERT INTO public.notifications (user_id, title, message, type, related_job_id)
  VALUES (p_user_id, p_title, p_message, p_type, p_related_job_id)
  RETURNING id INTO v_notification_id;
  
  RETURN v_notification_id;
END;
$$;

-- Create trigger to notify staff when a job is assigned to them
CREATE OR REPLACE FUNCTION public.notify_job_assignment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only notify if a staff member is being assigned
  IF NEW.assigned_staff_id IS NOT NULL AND 
     (OLD.assigned_staff_id IS NULL OR OLD.assigned_staff_id != NEW.assigned_staff_id) THEN
    
    PERFORM public.create_notification(
      NEW.assigned_staff_id,
      'Nuevo trabajo asignado',
      'Se te ha asignado un nuevo trabajo en ' || NEW.location || ' para el ' || NEW.scheduled_date,
      'job_assigned',
      NEW.id
    );
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_job_assignment
  AFTER INSERT OR UPDATE ON public.jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_job_assignment();

-- Create trigger to notify when job status changes
CREATE OR REPLACE FUNCTION public.notify_job_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Notify assigned staff when job is completed
  IF NEW.status = 'completed' AND OLD.status != 'completed' AND NEW.assigned_staff_id IS NOT NULL THEN
    PERFORM public.create_notification(
      NEW.assigned_staff_id,
      'Trabajo completado',
      'El trabajo en ' || NEW.location || ' ha sido marcado como completado',
      'job_completed',
      NEW.id
    );
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_job_status_change
  AFTER UPDATE ON public.jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_job_status_change();