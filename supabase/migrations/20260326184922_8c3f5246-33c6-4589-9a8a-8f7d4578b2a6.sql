
CREATE TABLE public.product_subcategories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  subcategory_id uuid NOT NULL REFERENCES public.subcategories(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(product_id, subcategory_id)
);

ALTER TABLE public.product_subcategories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view product subcategories" ON public.product_subcategories FOR SELECT TO public USING (true);
CREATE POLICY "Admins can manage product subcategories" ON public.product_subcategories FOR ALL TO public USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Migrate existing subcategory_id data to junction table
INSERT INTO public.product_subcategories (product_id, subcategory_id)
SELECT id, subcategory_id FROM public.products WHERE subcategory_id IS NOT NULL
ON CONFLICT DO NOTHING;
