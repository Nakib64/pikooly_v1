-- Soft-delete support for orders
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by UUID;

CREATE INDEX IF NOT EXISTS idx_orders_deleted_at ON public.orders (deleted_at);

-- Update public SELECT policies to hide soft-deleted orders from customers
DROP POLICY IF EXISTS "Users can view own orders" ON public.orders;
CREATE POLICY "Users can view own orders"
ON public.orders
FOR SELECT
USING (auth.uid() = user_id AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Anon can view guest orders on insert" ON public.orders;
CREATE POLICY "Anon can view guest orders on insert"
ON public.orders
FOR SELECT
USING (user_id IS NULL AND deleted_at IS NULL);

-- Admin policy already covers all rows via has_role(); no change needed.
