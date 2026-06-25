-- Add per-product delivery type and fee override
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS delivery_type text NOT NULL DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS delivery_fee_override numeric;

-- Optional check constraint via trigger (avoid CHECK on data)
CREATE OR REPLACE FUNCTION public.validate_product_delivery_type()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.delivery_type NOT IN ('same_day','next_day','standard','economy') THEN
    RAISE EXCEPTION 'Invalid delivery_type: %', NEW.delivery_type;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_product_delivery_type ON public.products;
CREATE TRIGGER trg_validate_product_delivery_type
BEFORE INSERT OR UPDATE OF delivery_type ON public.products
FOR EACH ROW EXECUTE FUNCTION public.validate_product_delivery_type();