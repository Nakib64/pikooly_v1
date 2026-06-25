-- 1) notification_templates: remove public read, allow authenticated only
DROP POLICY IF EXISTS "Anyone can read templates" ON public.notification_templates;
CREATE POLICY "Authenticated can read templates"
  ON public.notification_templates
  FOR SELECT
  TO authenticated
  USING (true);

-- 2) search_queries: drop overly broad UPDATE policy.
-- The log_search_query() SECURITY DEFINER function does the upsert, so no client-side UPDATE policy is required.
DROP POLICY IF EXISTS "Anyone can update search counts" ON public.search_queries;