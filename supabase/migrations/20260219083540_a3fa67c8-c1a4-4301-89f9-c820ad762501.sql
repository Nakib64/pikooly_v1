
ALTER TABLE public.products ADD COLUMN specifications jsonb DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.products.specifications IS 'Array of {item, value} objects for product specifications';
