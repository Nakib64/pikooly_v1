ALTER TABLE public.blogs ADD COLUMN IF NOT EXISTS subcategories text[] NOT NULL DEFAULT '{}'::text[];
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS show_on_blog_sidebar boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_coupons_blog_sidebar ON public.coupons(show_on_blog_sidebar) WHERE show_on_blog_sidebar = true;