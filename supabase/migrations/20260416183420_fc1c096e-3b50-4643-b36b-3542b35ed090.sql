-- Admin activity log table
CREATE TABLE public.admin_activity_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  user_email TEXT,
  action TEXT NOT NULL,
  description TEXT,
  ip_address TEXT,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_admin_activity_log_created_at ON public.admin_activity_log (created_at DESC);
CREATE INDEX idx_admin_activity_log_user_id ON public.admin_activity_log (user_id);
CREATE INDEX idx_admin_activity_log_action ON public.admin_activity_log (action);

ALTER TABLE public.admin_activity_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view the log
CREATE POLICY "Admins can view activity log"
ON public.admin_activity_log
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Anyone can insert (so failed logins / unauth events can also be recorded from the client)
CREATE POLICY "Anyone can insert activity log"
ON public.admin_activity_log
FOR INSERT
WITH CHECK (true);

-- Only admins can delete (for cleanup)
CREATE POLICY "Admins can delete activity log"
ON public.admin_activity_log
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));