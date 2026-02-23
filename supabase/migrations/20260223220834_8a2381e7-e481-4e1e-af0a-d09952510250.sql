
CREATE INDEX IF NOT EXISTS idx_login_attempts_email_time 
  ON public.login_attempts (email, attempted_at DESC);
