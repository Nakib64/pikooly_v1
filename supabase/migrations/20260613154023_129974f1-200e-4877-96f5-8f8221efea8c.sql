ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS cod_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS hide_delivery_datetime boolean NOT NULL DEFAULT false;