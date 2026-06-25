CREATE TABLE public.subcategory_delivery_modes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subcategory_id uuid NOT NULL REFERENCES public.subcategories(id) ON DELETE CASCADE UNIQUE,
  mode_id uuid NOT NULL REFERENCES public.delivery_modes(id) ON DELETE CASCADE,
  fallback_mode_id uuid REFERENCES public.delivery_modes(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.subcategory_delivery_modes IS 'Per-subcategory delivery mode mapping. Takes precedence over category_delivery_modes. Overridden by products.delivery_mode_id.';

GRANT SELECT ON public.subcategory_delivery_modes TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.subcategory_delivery_modes TO authenticated;
GRANT ALL ON public.subcategory_delivery_modes TO service_role;

ALTER TABLE public.subcategory_delivery_modes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read subcategory delivery modes"
  ON public.subcategory_delivery_modes FOR SELECT
  USING (true);

CREATE POLICY "Admins manage subcategory delivery modes"
  ON public.subcategory_delivery_modes FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_subcategory_delivery_modes_updated_at
  BEFORE UPDATE ON public.subcategory_delivery_modes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();