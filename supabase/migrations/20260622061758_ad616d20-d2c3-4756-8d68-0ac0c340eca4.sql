CREATE TABLE public.delivery_mode_exclusions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mode_id UUID NOT NULL REFERENCES public.delivery_modes(id) ON DELETE CASCADE,
  scope TEXT NOT NULL CHECK (scope IN ('product','subcategory')),
  scope_id UUID NOT NULL,
  city_name TEXT NOT NULL,
  thana TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_dme_scope ON public.delivery_mode_exclusions(scope, scope_id);
CREATE INDEX idx_dme_mode ON public.delivery_mode_exclusions(mode_id);
CREATE UNIQUE INDEX uniq_dme ON public.delivery_mode_exclusions(mode_id, scope, scope_id, lower(city_name), lower(COALESCE(thana,'')));

GRANT SELECT ON public.delivery_mode_exclusions TO anon, authenticated;
GRANT ALL ON public.delivery_mode_exclusions TO service_role;
GRANT INSERT, UPDATE, DELETE ON public.delivery_mode_exclusions TO authenticated;

ALTER TABLE public.delivery_mode_exclusions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view delivery exclusions"
  ON public.delivery_mode_exclusions FOR SELECT
  USING (true);

CREATE POLICY "Admins manage delivery exclusions"
  ON public.delivery_mode_exclusions FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_dme_updated_at
  BEFORE UPDATE ON public.delivery_mode_exclusions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();