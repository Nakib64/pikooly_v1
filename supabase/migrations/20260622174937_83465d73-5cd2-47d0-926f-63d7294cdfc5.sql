
CREATE TABLE public.upazilas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  district_id UUID NOT NULL REFERENCES public.shipping_districts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  delivery_fee NUMERIC,
  same_day_fee NUMERIC,
  next_day_fee NUMERIC,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (district_id, name)
);

CREATE INDEX idx_upazilas_district ON public.upazilas(district_id);
CREATE INDEX idx_upazilas_active ON public.upazilas(is_active);

GRANT SELECT ON public.upazilas TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.upazilas TO authenticated;
GRANT ALL ON public.upazilas TO service_role;

ALTER TABLE public.upazilas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active upazilas"
  ON public.upazilas FOR SELECT
  USING (is_active = true OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage upazilas"
  ON public.upazilas FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_upazilas_updated_at
  BEFORE UPDATE ON public.upazilas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add upazila reference to orders (optional, for future fee/tracking use)
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS upazila_id UUID REFERENCES public.upazilas(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS upazila_name TEXT;
