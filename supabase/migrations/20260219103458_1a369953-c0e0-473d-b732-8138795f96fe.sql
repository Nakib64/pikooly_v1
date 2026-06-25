
-- Fix site_settings RLS policies (same restrictive issue)
DROP POLICY IF EXISTS "Admins can manage settings" ON public.site_settings;
DROP POLICY IF EXISTS "Anyone can view settings" ON public.site_settings;

CREATE POLICY "Admins can manage settings"
ON public.site_settings
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view settings"
ON public.site_settings
FOR SELECT
TO public
USING (true);
