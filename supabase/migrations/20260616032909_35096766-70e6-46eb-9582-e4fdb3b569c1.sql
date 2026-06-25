-- Add per-product seller payout price
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS seller_price numeric;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS seller_price numeric;

-- Snapshot seller_price into order_items at insert time
CREATE OR REPLACE FUNCTION public.snapshot_order_item_seller_price()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.seller_price IS NULL AND NEW.product_id IS NOT NULL THEN
    SELECT seller_price INTO NEW.seller_price FROM public.products WHERE id = NEW.product_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_snapshot_seller_price ON public.order_items;
CREATE TRIGGER trg_snapshot_seller_price
BEFORE INSERT ON public.order_items
FOR EACH ROW EXECUTE FUNCTION public.snapshot_order_item_seller_price();