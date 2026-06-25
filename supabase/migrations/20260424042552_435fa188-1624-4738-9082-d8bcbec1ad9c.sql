
-- Product Sizes (with extra price)
CREATE TABLE public.product_sizes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  extra_price NUMERIC NOT NULL DEFAULT 0,
  stock INTEGER NOT NULL DEFAULT 0,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.product_sizes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active product sizes"
  ON public.product_sizes FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage product sizes"
  ON public.product_sizes FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_product_sizes_updated_at
  BEFORE UPDATE ON public.product_sizes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_product_sizes_product ON public.product_sizes(product_id);

-- Product Colors (same price, just selection)
CREATE TABLE public.product_colors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  hex_code TEXT NOT NULL DEFAULT '#cccccc',
  image_url TEXT,
  stock INTEGER NOT NULL DEFAULT 0,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.product_colors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active product colors"
  ON public.product_colors FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage product colors"
  ON public.product_colors FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_product_colors_updated_at
  BEFORE UPDATE ON public.product_colors
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_product_colors_product ON public.product_colors(product_id);

-- Bouquet builder color options
CREATE TABLE public.bouquet_colors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  hex_code TEXT NOT NULL DEFAULT '#cccccc',
  image_url TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.bouquet_colors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active bouquet colors"
  ON public.bouquet_colors FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage bouquet colors"
  ON public.bouquet_colors FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_bouquet_colors_updated_at
  BEFORE UPDATE ON public.bouquet_colors
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Track selected variants in orders
ALTER TABLE public.order_items
  ADD COLUMN selected_size TEXT,
  ADD COLUMN selected_color TEXT;

ALTER TABLE public.bouquet_orders
  ADD COLUMN selected_color TEXT;
