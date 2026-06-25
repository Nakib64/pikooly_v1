-- Drop the existing insert policy and recreate it to properly allow guest and authenticated orders
DROP POLICY IF EXISTS "Anyone can create orders" ON public.orders;

CREATE POLICY "Anyone can create orders"
ON public.orders
FOR INSERT
TO anon, authenticated
WITH CHECK (
  user_id IS NULL OR auth.uid() = user_id
);

-- Also ensure order_items can be inserted by anyone placing an order
DROP POLICY IF EXISTS "Anyone can create order items" ON public.order_items;

CREATE POLICY "Anyone can create order items"
ON public.order_items
FOR INSERT
TO anon, authenticated
WITH CHECK (true);