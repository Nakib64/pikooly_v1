
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS is_preorder boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS preorder_note text,
  ADD COLUMN IF NOT EXISTS preorder_advance_percent integer NOT NULL DEFAULT 50;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS advance_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS due_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_preorder boolean NOT NULL DEFAULT false;
