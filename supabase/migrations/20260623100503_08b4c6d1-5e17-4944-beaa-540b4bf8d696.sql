ALTER TABLE public.subcategories
  ADD COLUMN IF NOT EXISTS show_cart_addons boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS cod_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS hide_delivery_datetime boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS category_types text[] NOT NULL DEFAULT '{}'::text[];