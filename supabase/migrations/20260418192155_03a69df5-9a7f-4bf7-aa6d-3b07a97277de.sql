ALTER TABLE public.shipping_districts
  ADD COLUMN IF NOT EXISTS morning_slot_fee numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS morning_slot_label text DEFAULT 'Morning Slot (9 AM - 2 PM)',
  ADD COLUMN IF NOT EXISTS evening_slot_fee numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS evening_slot_label text DEFAULT 'Evening Slot (4 PM - 10 PM)';

UPDATE public.shipping_districts
SET morning_slot_fee = same_day_fee
WHERE morning_slot_fee = 0 AND same_day_fee > 0;

UPDATE public.shipping_districts
SET evening_slot_fee = same_day_fee
WHERE evening_slot_fee = 0 AND same_day_fee > 0;

ALTER TABLE public.shipping_category_fees
  ADD COLUMN IF NOT EXISTS morning_slot_fee numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS morning_slot_label text DEFAULT 'Morning Slot (9 AM - 2 PM)',
  ADD COLUMN IF NOT EXISTS evening_slot_fee numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS evening_slot_label text DEFAULT 'Evening Slot (4 PM - 10 PM)';

UPDATE public.shipping_category_fees
SET morning_slot_fee = same_day_fee
WHERE morning_slot_fee = 0 AND same_day_fee > 0;

UPDATE public.shipping_category_fees
SET evening_slot_fee = same_day_fee
WHERE evening_slot_fee = 0 AND same_day_fee > 0;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS delivery_slot text;