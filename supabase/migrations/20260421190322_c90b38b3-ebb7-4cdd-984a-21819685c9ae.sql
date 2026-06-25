ALTER TABLE public.shipping_districts
  ALTER COLUMN same_day_fee DROP NOT NULL,
  ALTER COLUMN next_day_fee DROP NOT NULL;

ALTER TABLE public.shipping_category_fees
  ALTER COLUMN same_day_fee DROP NOT NULL,
  ALTER COLUMN next_day_fee DROP NOT NULL;