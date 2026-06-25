ALTER TABLE public.bouquet_flowers
ADD COLUMN IF NOT EXISTS available_districts text[] NOT NULL DEFAULT '{}'::text[];