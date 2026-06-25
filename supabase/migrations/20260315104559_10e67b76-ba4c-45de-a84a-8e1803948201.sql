
-- Bouquet flowers table
CREATE TABLE public.bouquet_flowers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  image_url TEXT,
  price NUMERIC NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.bouquet_flowers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage bouquet flowers" ON public.bouquet_flowers FOR ALL TO public
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view active bouquet flowers" ON public.bouquet_flowers FOR SELECT TO public
  USING (is_active = true);

-- Bouquet materials table
CREATE TABLE public.bouquet_materials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  image_url TEXT,
  price NUMERIC NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.bouquet_materials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage bouquet materials" ON public.bouquet_materials FOR ALL TO public
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view active bouquet materials" ON public.bouquet_materials FOR SELECT TO public
  USING (is_active = true);

-- Bouquet sizes table
CREATE TABLE public.bouquet_sizes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  extra_price NUMERIC NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.bouquet_sizes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage bouquet sizes" ON public.bouquet_sizes FOR ALL TO public
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view active bouquet sizes" ON public.bouquet_sizes FOR SELECT TO public
  USING (is_active = true);

-- Bouquet orders table to store custom bouquet details
CREATE TABLE public.bouquet_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  flowers JSONB NOT NULL DEFAULT '[]'::jsonb,
  material_id UUID REFERENCES public.bouquet_materials(id),
  size_id UUID REFERENCES public.bouquet_sizes(id),
  gift_message TEXT,
  total_price NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.bouquet_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage bouquet orders" ON public.bouquet_orders FOR ALL TO public
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can create bouquet orders" ON public.bouquet_orders FOR INSERT TO public
  WITH CHECK (true);

CREATE POLICY "Users can view own bouquet orders" ON public.bouquet_orders FOR SELECT TO public
  USING (EXISTS (
    SELECT 1 FROM orders WHERE orders.id = bouquet_orders.order_id AND (orders.user_id = auth.uid() OR orders.user_id IS NULL)
  ));
