ALTER TABLE public.bouquet_flowers
ADD COLUMN IF NOT EXISTS same_day_districts text[] NOT NULL DEFAULT '{}'::text[],
ADD COLUMN IF NOT EXISTS next_day_districts text[] NOT NULL DEFAULT '{}'::text[];