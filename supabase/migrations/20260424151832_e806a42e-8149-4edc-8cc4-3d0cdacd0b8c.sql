-- Add per-product delivery control columns
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS same_day_districts text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS next_day_districts text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS standard_delivery_days integer NOT NULL DEFAULT 3;

-- Helpful comments for future maintainers
COMMENT ON COLUMN public.products.same_day_districts IS 'List of district names where this product supports Same Day delivery';
COMMENT ON COLUMN public.products.next_day_districts IS 'List of district names where this product supports Next Day delivery';
COMMENT ON COLUMN public.products.standard_delivery_days IS 'Default number of days for standard delivery to other districts';