ALTER TABLE public.shipping_districts
  DROP COLUMN IF EXISTS morning_slot_fee,
  DROP COLUMN IF EXISTS morning_slot_label,
  DROP COLUMN IF EXISTS evening_slot_fee,
  DROP COLUMN IF EXISTS evening_slot_label;

ALTER TABLE public.shipping_category_fees
  DROP COLUMN IF EXISTS morning_slot_fee,
  DROP COLUMN IF EXISTS morning_slot_label,
  DROP COLUMN IF EXISTS evening_slot_fee,
  DROP COLUMN IF EXISTS evening_slot_label;

ALTER TABLE public.orders
  DROP COLUMN IF EXISTS delivery_slot;