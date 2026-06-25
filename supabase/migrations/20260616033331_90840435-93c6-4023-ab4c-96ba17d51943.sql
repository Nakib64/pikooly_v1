ALTER TABLE public.sellers
  ADD COLUMN IF NOT EXISTS payout_method text,
  ADD COLUMN IF NOT EXISTS bkash_number text,
  ADD COLUMN IF NOT EXISTS bank_name text,
  ADD COLUMN IF NOT EXISTS bank_account_name text,
  ADD COLUMN IF NOT EXISTS bank_account_number text,
  ADD COLUMN IF NOT EXISTS bank_branch text,
  ADD COLUMN IF NOT EXISTS bank_routing_number text,
  ADD COLUMN IF NOT EXISTS payout_updated_at timestamptz;