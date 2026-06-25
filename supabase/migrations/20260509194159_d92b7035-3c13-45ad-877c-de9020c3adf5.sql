ALTER TABLE public.category_delivery_modes
ADD COLUMN IF NOT EXISTS fallback_mode_id uuid;