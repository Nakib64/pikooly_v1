ALTER TABLE public.bouquet_flowers
  ADD COLUMN IF NOT EXISTS same_day_thanas text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS next_day_thanas text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS available_thanas text[] NOT NULL DEFAULT '{}';