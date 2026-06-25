-- Add Same Day and Next Day delivery fees to shipping_districts
ALTER TABLE public.shipping_districts
  ADD COLUMN IF NOT EXISTS same_day_fee numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS next_day_fee numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS same_day_label text DEFAULT 'Same Day Delivery',
  ADD COLUMN IF NOT EXISTS next_day_label text DEFAULT 'Next Day Delivery';

-- Backfill existing fees: use current delivery_fee as same_day_fee, set next_day_fee a bit lower (or same)
UPDATE public.shipping_districts
SET same_day_fee = delivery_fee,
    next_day_fee = GREATEST(delivery_fee - 20, 0)
WHERE same_day_fee = 0 AND next_day_fee = 0;

-- Add the same to shipping_category_fees for category-level overrides
ALTER TABLE public.shipping_category_fees
  ADD COLUMN IF NOT EXISTS same_day_fee numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS next_day_fee numeric NOT NULL DEFAULT 0;

UPDATE public.shipping_category_fees
SET same_day_fee = delivery_fee,
    next_day_fee = GREATEST(delivery_fee - 20, 0)
WHERE same_day_fee = 0 AND next_day_fee = 0;

-- Add delivery_type column to orders to track which option was chosen
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS delivery_type text DEFAULT 'same_day';