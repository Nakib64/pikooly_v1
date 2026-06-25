-- Fix: The policies need to be PERMISSIVE (default) not RESTRICTIVE
-- Drop and recreate the order insert policy as PERMISSIVE
DROP POLICY IF EXISTS "Anyone can create orders" ON public.orders;

CREATE POLICY "Anyone can create orders"
ON public.orders
FOR INSERT
TO anon, authenticated
WITH CHECK (
  user_id IS NULL OR auth.uid() = user_id
);

-- Also fix order_items insert policy
DROP POLICY IF EXISTS "Anyone can create order items" ON public.order_items;

CREATE POLICY "Anyone can create order items"
ON public.order_items
FOR INSERT
TO anon, authenticated
WITH CHECK (true);