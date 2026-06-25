
CREATE TABLE public.shipping_category_fees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  district_id UUID NOT NULL REFERENCES public.shipping_districts(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  delivery_fee NUMERIC NOT NULL DEFAULT 0,
  delivery_label TEXT DEFAULT 'Standard Delivery',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(district_id, category_id)
);

ALTER TABLE public.shipping_category_fees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage shipping category fees"
ON public.shipping_category_fees FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view shipping category fees"
ON public.shipping_category_fees FOR SELECT
USING (true);
