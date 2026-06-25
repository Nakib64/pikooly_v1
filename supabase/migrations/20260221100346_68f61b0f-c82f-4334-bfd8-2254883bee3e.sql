
-- Junction table for many-to-many product-category relationship
CREATE TABLE public.product_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(product_id, category_id)
);

-- Enable RLS
ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;

-- Anyone can view
CREATE POLICY "Anyone can view product categories"
ON public.product_categories FOR SELECT
USING (true);

-- Admins can manage
CREATE POLICY "Admins can manage product categories"
ON public.product_categories FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Migrate existing category_id data into junction table
INSERT INTO public.product_categories (product_id, category_id)
SELECT id, category_id FROM public.products WHERE category_id IS NOT NULL
ON CONFLICT DO NOTHING;
