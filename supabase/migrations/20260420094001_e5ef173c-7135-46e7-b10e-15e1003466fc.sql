ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS instructions text,
ADD COLUMN IF NOT EXISTS delivery_info text;