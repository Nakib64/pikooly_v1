DROP TRIGGER IF EXISTS trg_validate_product_delivery_type ON public.products;
DROP FUNCTION IF EXISTS public.validate_product_delivery_type() CASCADE;

ALTER TABLE public.products
  DROP COLUMN IF EXISTS delivery_type CASCADE,
  DROP COLUMN IF EXISTS delivery_fee_override,
  DROP COLUMN IF EXISTS same_day_districts,
  DROP COLUMN IF EXISTS next_day_districts,
  DROP COLUMN IF EXISTS standard_delivery_days;