ALTER TABLE public.delivery_mode_cities 
  ADD COLUMN IF NOT EXISTS charge_override numeric,
  ADD COLUMN IF NOT EXISTS thana text;