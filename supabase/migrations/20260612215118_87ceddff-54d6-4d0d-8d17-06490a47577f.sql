ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS show_cart_addons boolean NOT NULL DEFAULT false;
UPDATE public.categories SET show_cart_addons = true WHERE slug IN ('flowers','cakes','gifts');