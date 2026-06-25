ALTER TABLE public.sellers
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS name_updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS phone_updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS password_changed_at timestamptz,
  ADD COLUMN IF NOT EXISTS avatar_updated_at timestamptz;